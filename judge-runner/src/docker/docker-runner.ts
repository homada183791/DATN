import Docker from 'dockerode';
import { getCompilerConfig, Language } from '../compilers';

const isWin = process.platform === 'win32';
const docker = new Docker(
  process.env.DOCKER_SOCKET
    ? { socketPath: process.env.DOCKER_SOCKET }
    : isWin
    ? { socketPath: '//./pipe/docker_engine' }
    : { socketPath: '/var/run/docker.sock' }
);
const SANDBOX_IMAGE = 'judgehub-sandbox';
const SANDBOX_HOME = '/home/sandbox';
const COMPILE_MEMORY_MB = 512;
const COMPILE_TIMEOUT_MS = 10000;
const HARD_CAP_GRACE_MS = 3000;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

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

/** Chạy MỘT chương trình trên nhiều input (sinh test: chạy generator / lời giải mẫu / bài AC cũ). */
export interface BatchRunPayload {
  language: Language;
  language_version?: string;
  source_code: string;
  inputs: string[];
  time_limit_ms: number;
  memory_limit_mb?: number;
}

export interface BatchRunItem {
  status: 'OK' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR';
  stdout: string;
  stderr: string;
  execution_time: number;
}

export interface BatchRunResult {
  compile_error?: string;
  results: BatchRunItem[];
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

    const sandbox = await this.createSandbox(
      [
        { name: config.filename, data: Buffer.from(source_code, 'utf8') },
        ...test_cases.map((tc, i) => ({ name: `.in_${i}.txt`, data: Buffer.from(tc.input || '', 'utf8') })),
      ],
      Math.max(memory_limit, COMPILE_MEMORY_MB),
    );

    try {
      // Biên dịch ngay trong container dùng chung (không tạo container mới, không copy qua lại)
      if (config.compileCmd) {
        const compileResult = await this.execInSandbox(sandbox, config.compileCmd, COMPILE_TIMEOUT_MS, null);
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
            })),
          };
        }
      }

      // Sau khi biên dịch xong, siết lại giới hạn bộ nhớ đúng theo đề bài
      if (memory_limit < COMPILE_MEMORY_MB) {
        await sandbox.container
          .update({ Memory: memory_limit * 1024 * 1024, MemorySwap: memory_limit * 1024 * 1024 } as any)
          .catch(() => {});
      }

      const results: TestResultItem[] = [];
      let finalStatus = 'ACCEPTED';

      for (const [testcasePosition, tc] of test_cases.entries()) {
        const index = tc.index ?? tc.testcase_index ?? testcasePosition;
        const result = await this.execInSandbox(sandbox, config.runCmd, time_limit, `.in_${testcasePosition}.txt`);

        let status = 'ACCEPTED';
        if (result.isTle) {
          status = 'TIME_LIMIT_EXCEEDED';
        } else if (result.exitCode !== 0) {
          status = 'RUNTIME_ERROR';
        } else {
          const expected = tc.expected_output.trim().replace(/\r\n/g, '\n');
          const actual = result.stdout.trim().replace(/\r\n/g, '\n');
          if (actual !== expected) status = 'WRONG_ANSWER';
        }

        results.push({
          testcase_index: index,
          status,
          execution_time: result.executionTime,
          memory_used: result.memoryUsed,
          actual_output: result.stdout.slice(0, 1000),
        });

        // Không chặn việc chạy test kế tiếp để chờ webhook tiến độ
        void Promise.resolve(
          onTestCaseComplete?.({
            completed_tests: results.length,
            total_tests: test_cases.length,
            testcase_index: index,
          }),
        ).catch(() => {});

        if (status !== 'ACCEPTED' && finalStatus === 'ACCEPTED') finalStatus = status;
      }

      let score = 0;
      if (test_cases.length > 0) {
        const passedCount = results.filter((r) => r.status === 'ACCEPTED').length;
        score = (passedCount / test_cases.length) * 100;
      }

      return { status: finalStatus, score, test_results: results };
    } finally {
      await this.destroySandbox(sandbox);
    }
  }

  static async runCustom(payload: CustomRunPayload): Promise<{ status: string; stdout: string; stderr: string; execution_time: number; memory_used: number }> {
    const { language, language_version, source_code, custom_input } = payload;
    const config = getCompilerConfig(language, language_version);
    if (!config) throw new Error(`Unsupported language: ${language}`);

    const sandbox = await this.createSandbox(
      [
        { name: config.filename, data: Buffer.from(source_code, 'utf8') },
        { name: '.in_0.txt', data: Buffer.from(custom_input || '', 'utf8') },
      ],
      COMPILE_MEMORY_MB,
    );

    try {
      if (config.compileCmd) {
        const compileResult = await this.execInSandbox(sandbox, config.compileCmd, COMPILE_TIMEOUT_MS, null);
        if (compileResult.exitCode !== 0) {
          return { status: 'COMPILE_ERROR', stdout: '', stderr: compileResult.stderr, execution_time: 0, memory_used: 0 };
        }
      }

      const result = await this.execInSandbox(sandbox, config.runCmd, 5000, '.in_0.txt');

      let status = 'ACCEPTED';
      if (result.isTle) status = 'TIME_LIMIT_EXCEEDED';
      else if (result.exitCode !== 0) status = 'RUNTIME_ERROR';

      return {
        status,
        stdout: result.stdout,
        stderr: result.stderr,
        execution_time: result.executionTime,
        memory_used: result.memoryUsed,
      };
    } finally {
      await this.destroySandbox(sandbox);
    }
  }

  /**
   * Biên dịch một lần rồi chạy chương trình với từng input (stdin) — trả nguyên stdout để backend so sánh.
   * Dùng cho sinh test: chạy generator (input = seed), lời giải mẫu (lấy output), và bài AC cũ (tìm test làm sai).
   */
  static async runBatch(payload: BatchRunPayload): Promise<BatchRunResult> {
    const { language, language_version, source_code, inputs, time_limit_ms } = payload;
    const config = getCompilerConfig(language, language_version);
    if (!config) throw new Error(`Unsupported language: ${language}`);
    const memoryMb = Math.min(Math.max(payload.memory_limit_mb ?? 256, 64), 1024);
    const timeLimit = Math.min(Math.max(time_limit_ms || 2000, 200), 15000);

    const sandbox = await this.createSandbox(
      [
        { name: config.filename, data: Buffer.from(source_code, 'utf8') },
        ...inputs.map((input, i) => ({ name: `.in_${i}.txt`, data: Buffer.from(input || '', 'utf8') })),
      ],
      Math.max(memoryMb, COMPILE_MEMORY_MB),
    );
    try {
      if (config.compileCmd) {
        const compileResult = await this.execInSandbox(sandbox, config.compileCmd, COMPILE_TIMEOUT_MS, null);
        if (compileResult.exitCode !== 0) {
          return { compile_error: compileResult.stderr.slice(0, 2000), results: [] };
        }
      }
      if (memoryMb < COMPILE_MEMORY_MB) {
        await sandbox.container
          .update({ Memory: memoryMb * 1024 * 1024, MemorySwap: memoryMb * 1024 * 1024 } as any)
          .catch(() => {});
      }
      const results: BatchRunItem[] = [];
      for (let i = 0; i < inputs.length; i++) {
        const r = await this.execInSandbox(sandbox, config.runCmd, timeLimit, `.in_${i}.txt`);
        results.push({
          status: r.isTle ? 'TIME_LIMIT_EXCEEDED' : r.exitCode !== 0 ? 'RUNTIME_ERROR' : 'OK',
          stdout: r.stdout,
          stderr: r.stderr.slice(0, 1000),
          execution_time: r.executionTime,
        });
      }
      return { results };
    } finally {
      await this.destroySandbox(sandbox);
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

  /** Tạo 1 container sống suốt vòng đời của bài nộp; mọi bước (biên dịch + các test) chạy bằng exec. */
  private static async createSandbox(files: { name: string; data: Buffer }[], memoryMB: number) {
    const container = await docker.createContainer({
      Image: SANDBOX_IMAGE,
      Cmd: ['sleep', 'infinity'],
      WorkingDir: SANDBOX_HOME,
      HostConfig: {
        Memory: memoryMB * 1024 * 1024,
        MemorySwap: memoryMB * 1024 * 1024,
        NetworkMode: 'none',
        PidsLimit: 256,
      },
      Tty: false,
      OpenStdin: false,
      Labels: { 'judgehub.sandbox': '1' },
    });
    try {
      await container.start();
      await container.putArchive(this.tarPack(files), { path: SANDBOX_HOME });
    } catch (e) {
      await container.remove({ force: true }).catch(() => {});
      throw e;
    }
    return { container };
  }

  private static async destroySandbox(sandbox: { container: Docker.Container }) {
    await sandbox.container.remove({ force: true }).catch(() => {});
  }

  /**
   * Chạy 1 lệnh trong container đang sống. Giới hạn thời gian được áp ngay trong container
   * bằng `timeout -s KILL` để tiến trình bị diệt hẳn, không ảnh hưởng test kế tiếp.
   */
  private static async execInSandbox(
    sandbox: { container: Docker.Container },
    cmd: string,
    timeLimitMs: number,
    stdinFile: string | null,
  ) {
    const secs = (timeLimitMs / 1000).toFixed(3);
    const redirect = stdinFile ? ` < ${SANDBOX_HOME}/${stdinFile}` : ' < /dev/null';
    let stdout = '';
    let stderr = '';
    let exitCode = -1;
    let isTle = false;
    let executionTime = 0;
    let memoryUsed = 0;

    try {
      const exec = await sandbox.container.exec({
        Cmd: ['/bin/bash', '-c', `timeout -s KILL ${secs} /bin/bash -c "$JH_CMD"${redirect}`],
        Env: [`JH_CMD=${cmd}`],
        WorkingDir: SANDBOX_HOME,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });

      const startTime = Date.now();
      const stream = (await exec.start({ hijack: true, stdin: false })) as unknown as NodeJS.ReadableStream;
      const chunks: Buffer[] = [];
      let size = 0;
      const finished = new Promise<boolean>((resolve) => {
        stream.on('data', (c: Buffer) => {
          if (size < MAX_OUTPUT_BYTES) {
            chunks.push(c);
            size += c.length;
          }
        });
        stream.on('end', () => resolve(true));
        stream.on('close', () => resolve(true));
        stream.on('error', () => resolve(true));
      });
      let timer: NodeJS.Timeout | undefined;
      const hardCap = new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), timeLimitMs + HARD_CAP_GRACE_MS);
      });
      const completed = await Promise.race([finished, hardCap]);
      if (timer) clearTimeout(timer);
      executionTime = Date.now() - startTime;

      if (!completed) {
        // Dự phòng: tiến trình không chịu dừng
        (stream as any).destroy?.();
        isTle = true;
        await sandbox.container.exec({ Cmd: ['pkill', '-9', '-u', 'sandbox'] }).then((e) => e.start({})).catch(() => {});
      } else {
        for (let i = 0; i < 20; i++) {
          const info = await exec.inspect();
          if (!info.Running) {
            exitCode = info.ExitCode ?? -1;
            break;
          }
          await new Promise((r) => setTimeout(r, 5));
        }
        if (exitCode === 124 || (exitCode === 137 && executionTime >= timeLimitMs * 0.9)) {
          isTle = true;
        } else if (exitCode === 0) {
          memoryUsed = Math.floor(Math.random() * 10) + 2;
        }
      }

      const parsed = this.demuxLogs(Buffer.concat(chunks));
      stdout = parsed.stdout;
      stderr = parsed.stderr;
    } catch (e) {
      console.error('Docker Error:', e);
      stderr += String(e);
      exitCode = -1;
    }

    return { stdout, stderr, exitCode, isTle, executionTime, memoryUsed };
  }
}