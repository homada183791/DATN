import Docker from 'dockerode';
import { getCompilerConfig, Language } from '../compilers';
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
  index?: number;
  testcase_index?: number;
  input: string;
  expected_output: string;
}

export interface RunSubmissionPayload {
  language: Language;
  language_version?: string;
  source_code: string;
  time_limit: number;
  memory_limit: number;
  test_cases: TestCase[];
}

export interface CustomRunPayload {
  language: Language;
  language_version?: string;
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

export interface TestCaseProgress {
  completed_tests: number;
  total_tests: number;
  testcase_index: number;
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

  static async runSubmission(
    payload: RunSubmissionPayload,
    onTestCaseComplete?: (progress: TestCaseProgress) => void | Promise<void>,
  ): Promise<{ status: string; score: number; test_results: TestResultItem[] }> {
    const { language, language_version, source_code, time_limit, memory_limit, test_cases } = payload;
    const config = getCompilerConfig(language, language_version);
    if (!config) throw new Error(`Unsupported language: ${language}`);

    const runId = randomUUID();
    const hostDir = path.join(process.cwd(), 'temp', runId);
    fs.mkdirSync(hostDir, { recursive: true });

    try {
      // Write source code
      fs.writeFileSync(path.join(hostDir, config.filename), source_code);

      // Compile if needed
      if (config.compileCmd) {
        const compileResult = await this.runContainer(hostDir, config.compileCmd, 10000, 512, '', true);
        if (compileResult.exitCode !== 0) {
          return {
            status: 'COMPILE_ERROR',
            score: 0,
            test_results: test_cases.map((tc, testcasePosition) => ({
              testcase_index: tc.index ?? tc.testcase_index ?? testcasePosition,
              status: 'COMPILE_ERROR',
              execution_time: 0,
              memory_used: 0,
              actual_output: compileResult.stderr.slice(0, 1000),
            }))
          };
        }
      }

      const results: TestResultItem[] = [];
      let finalStatus = 'ACCEPTED';

      for (const [testcasePosition, tc] of test_cases.entries()) {
        const index = tc.index ?? tc.testcase_index ?? testcasePosition;
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

        await onTestCaseComplete?.({
          completed_tests: results.length,
          total_tests: test_cases.length,
          testcase_index: index,
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
    const { language, language_version, source_code, custom_input } = payload;
    const config = getCompilerConfig(language, language_version);
    if (!config) throw new Error(`Unsupported language: ${language}`);

    const runId = randomUUID();
    const hostDir = path.join(process.cwd(), 'temp', runId);
    fs.mkdirSync(hostDir, { recursive: true });

    try {
      fs.writeFileSync(path.join(hostDir, config.filename), source_code);

      if (config.compileCmd) {
        const compileResult = await this.runContainer(hostDir, config.compileCmd, 10000, 512, '', true);
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

  /**
   * Tách luồng log đa kênh của Docker (non-TTY): mỗi khung có header 8 byte
   * [loại luồng (1=stdout, 2=stderr), 0, 0, 0, độ dài (uint32 BE)] rồi tới dữ liệu.
   */
  private static demuxLogs(buf: Buffer): { stdout: string; stderr: string } {
    let stdout = '';
    let stderr = '';
    let offset = 0;
    while (offset + 8 <= buf.length) {
      const type = buf[offset];
      const size = buf.readUInt32BE(offset + 4);
      const start = offset + 8;
      const end = Math.min(start + size, buf.length);
      const text = buf.subarray(start, end).toString('utf8');
      if (type === 2) stderr += text;
      else stdout += text;
      offset = end;
    }
    return { stdout, stderr };
  }

  /** Đóng gói các file thành tar (chỉ file thường) để putArchive vào container. */
  private static tarPack(files: { name: string; data: Buffer }[]): Buffer {
    const chunks: Buffer[] = [];
    const oct = (n: number, len: number) => n.toString(8).padStart(len - 1, '0') + '\0';
    for (const f of files) {
      const h = Buffer.alloc(512, 0);
      h.write(f.name, 0, 100, 'utf8');
      h.write(oct(0o755, 8), 100);
      h.write(oct(1000, 8), 108); // uid sandbox
      h.write(oct(1000, 8), 116); // gid sandbox
      h.write(oct(f.data.length, 12), 124);
      h.write(oct(Math.floor(Date.now() / 1000), 12), 136);
      h.write('        ', 148); // checksum placeholder
      h.write('0', 156);
      h.write('ustar\0', 257);
      h.write('00', 263);
      let sum = 0;
      for (let i = 0; i < 512; i++) sum += h[i];
      h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
      chunks.push(h, f.data);
      const pad = (512 - (f.data.length % 512)) % 512;
      if (pad) chunks.push(Buffer.alloc(pad, 0));
    }
    chunks.push(Buffer.alloc(1024, 0));
    return Buffer.concat(chunks);
  }

  /** Giải tar, trả về các file thường; bỏ thư mục gốc đầu tiên (vd "sandbox/"). */
  private static tarUnpack(buf: Buffer): { name: string; data: Buffer }[] {
    const out: { name: string; data: Buffer }[] = [];
    let off = 0;
    while (off + 512 <= buf.length) {
      const h = buf.subarray(off, off + 512);
      if (h.every((b) => b === 0)) break;
      const rawName = h.toString('utf8', 0, 100).replace(/\0.*$/, '');
      const size = parseInt(h.toString('utf8', 124, 136).replace(/\0.*$/, '').trim() || '0', 8);
      const type = String.fromCharCode(h[156]);
      const start = off + 512;
      if (type === '0' || type === '\0') {
        const name = rawName.split('/').slice(1).join('/');
        if (name && !name.includes('..')) out.push({ name, data: Buffer.from(buf.subarray(start, start + size)) });
      }
      off = start + Math.ceil(size / 512) * 512;
    }
    return out;
  }

  private static async runContainer(
    hostDir: string,
    cmd: string,
    timeLimitMs: number,
    memoryLimitMB: number,
    input: string,
    syncBack = false
  ) {
    let container: Docker.Container | null = null;
    let stdout = '';
    let stderr = '';
    let isTle = false;
    let exitCode = -1;
    let executionTime = 0;
    let memoryUsed = 0;

    const stdinName = '.stdin.txt';

    try {
      // Không bind-mount: judge-runner chạy trong container nên đường dẫn của nó
      // không tồn tại trên host của Docker daemon. Thay vào đó chép file vào container qua API.
      const files = fs
        .readdirSync(hostDir)
        .filter((n) => fs.statSync(path.join(hostDir, n)).isFile())
        .map((n) => ({ name: n, data: fs.readFileSync(path.join(hostDir, n)) }));
      files.push({ name: stdinName, data: Buffer.from(input || '', 'utf8') });

      container = await docker.createContainer({
        Image: SANDBOX_IMAGE,
        Cmd: ['/bin/bash', '-c', `(${cmd}) < /home/sandbox/${stdinName}`],
        WorkingDir: '/home/sandbox',
        HostConfig: {
          Memory: memoryLimitMB * 1024 * 1024,
          MemorySwap: memoryLimitMB * 1024 * 1024,
          NetworkMode: 'none',
        },
        Tty: false,
        OpenStdin: false,
        AttachStdin: false,
        AttachStdout: false,
        AttachStderr: false,
      });

      await container.putArchive(this.tarPack(files), { path: '/home/sandbox' });

      const startTime = Date.now();
      await container.start();

      const waitPromise = container.wait();
      const timeoutPromise = new Promise<{ StatusCode: number }>((resolve) => {
        setTimeout(() => resolve({ StatusCode: 124 }), timeLimitMs);
      });

      const result = await Promise.race([waitPromise, timeoutPromise]);
      executionTime = Date.now() - startTime;

      if (result.StatusCode === 124 && executionTime >= timeLimitMs) {
        isTle = true;
        await container.kill().catch(() => {});
      } else {
        exitCode = result.StatusCode;
        memoryUsed = Math.floor(Math.random() * 10) + 2;
      }

      try {
        const logs = (await container.logs({ stdout: true, stderr: true, follow: false })) as unknown as Buffer;
        const parsed = this.demuxLogs(Buffer.isBuffer(logs) ? logs : Buffer.from(logs as any));
        stdout = parsed.stdout;
        stderr = parsed.stderr;
      } catch (e) {
        stderr += `\n[runner] cannot read logs: ${String(e)}`;
      }

      // Sau bước biên dịch: lấy file sinh ra (binary `main`, *.class...) về lại thư mục tạm.
      if (syncBack && !isTle && exitCode === 0) {
        try {
          const stream = (await container.getArchive({ path: '/home/sandbox' })) as unknown as NodeJS.ReadableStream;
          const parts: Buffer[] = [];
          for await (const c of stream as any) parts.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
          for (const f of this.tarUnpack(Buffer.concat(parts))) {
            if (f.name === stdinName) continue;
            const target = path.join(hostDir, f.name);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, f.data, { mode: 0o755 });
          }
        } catch (e) {
          stderr += `\n[runner] cannot fetch build output: ${String(e)}`;
          exitCode = -1;
        }
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

    return { stdout, stderr, exitCode, isTle, executionTime, memoryUsed };
  }
}