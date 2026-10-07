import Docker from 'dockerode';
import { compilers, Language } from '../compilers';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const isWin = process.platform === 'win32';
const docker = new Docker(
  process.env.DOCKER_SOCKET
    ? { socketPath: process.env.DOCKER_SOCKET }
    : isWin
    ? { socketPath: '//./pipe/docker_engine' }
    : { socketPath: '/var/run/docker.sock' }
);
const SANDBOX_IMAGE = 'judgehub-sandbox';

export interface TestCase {
  index: number;
  input: string;
  expected_output: string;
}

export interface RunSubmissionPayload {
  language: Language;
  source_code: string;
  time_limit: number;
  memory_limit: number;
  test_cases: TestCase[];
}

export interface CustomRunPayload {
  language: Language;
  source_code: string;
  custom_input: string;
}

export interface TestResultItem {
  testcase_index: number;
  status: string;
  execution_time: number;
  memory_used: number;
  actual_output?: string;
}

export class DockerRunner {
  static async pullSandboxImage() {
    console.log(`Checking for sandbox image ${SANDBOX_IMAGE}...`);
    try {
      await docker.getImage(SANDBOX_IMAGE).inspect();
      console.log(`Sandbox image ${SANDBOX_IMAGE} found.`);
    } catch (err: any) {
      if (err.statusCode === 404) {
        console.error(`Sandbox image ${SANDBOX_IMAGE} not found. Please build it first: docker build -t ${SANDBOX_IMAGE} -f Dockerfile.sandbox .`);
      } else {
        throw err;
      }
    }
  }

  static async runSubmission(payload: RunSubmissionPayload): Promise<{ status: string; score: number; test_results: TestResultItem[] }> {
    const { language, source_code, time_limit, memory_limit, test_cases } = payload;
    const config = compilers[language];
    if (!config) throw new Error(`Unsupported language: ${language}`);

    const runId = randomUUID();
    const hostDir = path.join(process.cwd(), 'temp', runId);
    fs.mkdirSync(hostDir, { recursive: true });

    try {
      // Write source code
      fs.writeFileSync(path.join(hostDir, config.filename), source_code);

      // Compile if needed
      if (config.compileCmd) {
        const compileResult = await this.runContainer(hostDir, config.compileCmd, 10000, 512, '');
        if (compileResult.exitCode !== 0) {
          return {
            status: 'COMPILE_ERROR',
            score: 0,
            test_results: test_cases.map(tc => ({
              testcase_index: tc.index ?? (tc as any).testcase_index ?? 0,
              status: 'COMPILE_ERROR',
              execution_time: 0,
              memory_used: 0
            }))
          };
        }
      }

      const results: TestResultItem[] = [];
      let finalStatus = 'ACCEPTED';

      for (const tc of test_cases) {
        const index = tc.index ?? (tc as any).testcase_index ?? 0;
        // Run test case
        const result = await this.runContainer(hostDir, config.runCmd, time_limit, memory_limit, tc.input);

        let status = 'ACCEPTED';
        if (result.isTle) {
          status = 'TIME_LIMIT_EXCEEDED';
        } else if (result.exitCode !== 0) {
          // Could also be MLE if killed by OOM, but we simplify to RE
          status = 'RUNTIME_ERROR';
        } else {
          const expected = tc.expected_output.trim().replace(/\r\n/g, '\n');
          const actual = result.stdout.trim().replace(/\r\n/g, '\n');
          if (actual !== expected) {
            status = 'WRONG_ANSWER';
          }
        }

        results.push({
          testcase_index: index,
          status,
          execution_time: result.executionTime,
          memory_used: result.memoryUsed,
          actual_output: result.stdout.slice(0, 1000),
        });

        if (status !== 'ACCEPTED' && finalStatus === 'ACCEPTED') {
          finalStatus = status;
        }
      }

      let score = 0;
      if (test_cases.length > 0) {
        const passedCount = results.filter(r => r.status === 'ACCEPTED').length;
        score = (passedCount / test_cases.length) * 100;
      }

      return {
        status: finalStatus,
        score,
        test_results: results
      };
    } finally {
      // Clean up
      fs.rmSync(hostDir, { recursive: true, force: true });
    }
  }

  static async runCustom(payload: CustomRunPayload): Promise<{ status: string; stdout: string; stderr: string; execution_time: number; memory_used: number }> {
    const { language, source_code, custom_input } = payload;
    const config = compilers[language];
    if (!config) throw new Error(`Unsupported language: ${language}`);

    const runId = randomUUID();
    const hostDir = path.join(process.cwd(), 'temp', runId);
    fs.mkdirSync(hostDir, { recursive: true });

    try {
      fs.writeFileSync(path.join(hostDir, config.filename), source_code);

      if (config.compileCmd) {
        const compileResult = await this.runContainer(hostDir, config.compileCmd, 10000, 512, '');
        if (compileResult.exitCode !== 0) {
          return {
            status: 'COMPILE_ERROR',
            stdout: '',
            stderr: compileResult.stderr,
            execution_time: 0,
            memory_used: 0
          };
        }
      }

      const result = await this.runContainer(hostDir, config.runCmd, 5000, 512, custom_input); // Default 5s, 512MB for custom run

      let status = 'ACCEPTED';
      if (result.isTle) {
        status = 'TIME_LIMIT_EXCEEDED';
      } else if (result.exitCode !== 0) {
        status = 'RUNTIME_ERROR';
      }

      return {
        status,
        stdout: result.stdout,
        stderr: result.stderr,
        execution_time: result.executionTime,
        memory_used: result.memoryUsed
      };
    } finally {
      fs.rmSync(hostDir, { recursive: true, force: true });
    }
  }

  private static async runContainer(hostDir: string, cmd: string, timeLimitMs: number, memoryLimitMB: number, input: string) {
    let container: Docker.Container | null = null;
    let stdout = '';
    let stderr = '';
    let isTle = false;
    let exitCode = -1;
    let executionTime = 0;
    
    // Simplistic memory tracking - in a real-world scenario, you'd use cgroup memory stats.
    let memoryUsed = 0; 
    
    const startTime = Date.now();

    try {
      container = await docker.createContainer({
        Image: SANDBOX_IMAGE,
        Cmd: ['/bin/bash', '-c', cmd],
        WorkingDir: '/home/sandbox',
        HostConfig: {
          Binds: [`${hostDir}:/home/sandbox`],
          Memory: memoryLimitMB * 1024 * 1024,
          MemorySwap: memoryLimitMB * 1024 * 1024,
          NetworkMode: 'none',
        },
        OpenStdin: true,
        StdinOnce: true,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await container.attach({ stream: true, stdin: true, stdout: true, stderr: true });
      
      // Send input to stdin
      if (input) {
        stream.write(input);
      }
      stream.end();

      // Read stdout and stderr (multiplexed by Docker)
      container.modem.demuxStream(stream, {
        write: (chunk: Buffer) => stdout += chunk.toString('utf8')
      }, {
        write: (chunk: Buffer) => stderr += chunk.toString('utf8')
      });

      await container.start();

      // Implement Time Limit
      const waitPromise = container.wait();
      const timeoutPromise = new Promise<{ StatusCode: number }>((resolve) => {
        setTimeout(() => resolve({ StatusCode: 124 }), timeLimitMs); // 124 is often used for timeout
      });

      const result = await Promise.race([waitPromise, timeoutPromise]);
      executionTime = Date.now() - startTime;
      
      if (result.StatusCode === 124 && executionTime >= timeLimitMs) {
        isTle = true;
        await container.kill().catch(() => {});
      } else {
        exitCode = result.StatusCode;
        // Mock memory for now (or read from cgroups)
        memoryUsed = Math.floor(Math.random() * 10) + 2; 
      }
    } catch (e) {
      console.error('Docker Error:', e);
      stderr += String(e);
      exitCode = -1;
    } finally {
      if (container) {
        await container.remove({ force: true }).catch(() => {});
      }
    }

    return {
      stdout,
      stderr,
      exitCode,
      isTle,
      executionTime,
      memoryUsed
    };
  }
}
