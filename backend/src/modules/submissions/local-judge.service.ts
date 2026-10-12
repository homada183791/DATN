import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';

export interface TestResultItem {
  testcase_index: number;
  status: string;
  execution_time: number;
  memory_used: number;
  actual_output?: string;
}

export interface SubmissionEvaluationResult {
  status: string;
  score: number;
  execution_time: number;
  memory_used: number;
  test_results: TestResultItem[];
}

export interface CustomRunEvaluationResult {
  status: string;
  stdout: string;
  stderr: string;
  execution_time: number;
  memory_used: number;
}

@Injectable()
export class LocalJudgeService {
  private readonly logger = new Logger(LocalJudgeService.name);

  /**
   * Chạy mã nguồn với một bộ testcase cụ thể và trả về kết quả chi tiết
   */
  async runSingleTestCase(
    language: string,
    executablePath: string,
    isInterpreted: boolean,
    input: string,
    timeLimitMs: number,
  ): Promise<{ stdout: string; stderr: string; executionTime: number; isTle: boolean; exitCode: number }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let isTle = false;

      let cmd = executablePath;
      let args: string[] = [];

      const upperLang = (language || '').toUpperCase();
      if (upperLang === 'PYTHON') {
        cmd = process.platform === 'win32' ? 'python' : 'python3';
        args = [executablePath];
      } else if (upperLang === 'JAVA') {
        cmd = 'java';
        args = ['-cp', path.dirname(executablePath), 'Main'];
      } else if (upperLang === 'GO' && isInterpreted) {
        cmd = 'go';
        args = ['run', executablePath];
      } else if (upperLang === 'NODE' || upperLang === 'JAVASCRIPT') {
        cmd = 'node';
        args = [executablePath];
      }

      let child: any = null;
      try {
        child = spawn(cmd, args, {
          cwd: path.dirname(executablePath),
          windowsHide: true,
        });
      } catch (err: any) {
        return resolve({
          stdout: '',
          stderr: String(err?.message || err),
          executionTime: 0,
          isTle: false,
          exitCode: 1,
        });
      }

      const timer = setTimeout(() => {
        isTle = true;
        try {
          if (child && !child.killed) {
            child.kill('SIGKILL');
          }
        } catch {}
      }, Math.max(1000, timeLimitMs + 500));

      if (child.stdin) {
        try {
          child.stdin.write(input || '');
          child.stdin.end();
        } catch {}
      }

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
        if (stdout.length > 50000) {
          try { child.kill(); } catch {}
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timer);
        const executionTime = Math.min(timeLimitMs, Date.now() - startTime);
        resolve({
          stdout,
          stderr,
          executionTime,
          isTle,
          exitCode: isTle ? -1 : (code ?? 0),
        });
      });

      child.on('error', (err: any) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: stderr || String(err?.message || err),
          executionTime: Date.now() - startTime,
          isTle: false,
          exitCode: 1,
        });
      });
    });
  }

  /**
   * Biên dịch mã nguồn nếu là ngôn ngữ Compiled (C, CPP, JAVA, GO)
   */
  async compileCode(
    language: string,
    tempDir: string,
    sourceFileName: string,
    languageVersion?: string,
  ): Promise<{ success: boolean; executablePath: string; stderr: string }> {
    const upperLang = (language || '').toUpperCase();
    const upperVer = (languageVersion || '').toUpperCase();
    const sourceFilePath = path.join(tempDir, sourceFileName);

    if (upperLang === 'PYTHON' || upperLang === 'NODE' || upperLang === 'JAVASCRIPT' || upperVer.includes('PYTHON') || upperVer.includes('NODE')) {
      return { success: true, executablePath: sourceFilePath, stderr: '' };
    }

    const exeExtension = process.platform === 'win32' ? '.exe' : '';
    const outExePath = path.join(tempDir, `program_${randomUUID().slice(0, 8)}${exeExtension}`);

    let compileCmd = '';
    let compileArgs: string[] = [];

    if (upperLang === 'CPP' || upperVer.includes('CPP')) {
      compileCmd = 'g++';
      let stdFlag = '-std=c++17';
      if (upperVer.includes('11')) stdFlag = '-std=c++11';
      else if (upperVer.includes('14')) stdFlag = '-std=c++14';
      else if (upperVer.includes('20')) stdFlag = '-std=c++20';
      compileArgs = ['-O2', stdFlag, sourceFilePath, '-o', outExePath];
    } else if (upperLang === 'C' || upperVer.startsWith('C')) {
      compileCmd = 'gcc';
      let stdFlag = '-std=c11';
      if (upperVer.includes('99')) stdFlag = '-std=c99';
      compileArgs = ['-O2', stdFlag, sourceFilePath, '-o', outExePath];
    } else if (upperLang === 'JAVA' || upperVer.includes('JAVA')) {
      compileCmd = 'javac';
      compileArgs = [sourceFilePath];
    } else if (upperLang === 'GO' || upperVer.includes('GO')) {
      compileCmd = 'go';
      compileArgs = ['build', '-o', outExePath, sourceFilePath];
    }

    if (!compileCmd) {
      return { success: true, executablePath: sourceFilePath, stderr: '' };
    }

    return new Promise((resolve) => {
      let stderr = '';
      try {
        const child = spawn(compileCmd, compileArgs, { cwd: tempDir, windowsHide: true });
        child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
        child.on('close', (code: number) => {
          if (code === 0) {
            resolve({ success: true, executablePath: (upperLang === 'JAVA' || upperVer.includes('JAVA')) ? sourceFilePath : outExePath, stderr: '' });
          } else {
            resolve({ success: false, executablePath: '', stderr });
          }
        });
        child.on('error', (err: any) => {
          resolve({ success: false, executablePath: '', stderr: String(err?.message || err) });
        });
      } catch (err: any) {
        resolve({ success: false, executablePath: '', stderr: String(err?.message || err) });
      }
    });
  }

  /**
   * Chạy thử tùy biến (Custom Run)
   */
  async evaluateCustomRun(payload: {
    language: string;
    language_version?: string;
    source_code: string;
    custom_input: string;
    time_limit?: number;
  }): Promise<CustomRunEvaluationResult> {
    const { language, language_version, source_code, custom_input, time_limit = 2000 } = payload;
    const tempDir = path.join(os.tmpdir(), `datn_custom_${randomUUID()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      const extMap: Record<string, string> = {
        PYTHON: 'main.py',
        CPP: 'main.cpp',
        C: 'main.c',
        JAVA: 'Main.java',
        GO: 'main.go',
        NODE: 'main.js',
      };
      const fileName = extMap[language.toUpperCase()] || 'main.py';
      fs.writeFileSync(path.join(tempDir, fileName), source_code, 'utf-8');

      const compileResult = await this.compileCode(language, tempDir, fileName, language_version);
      if (!compileResult.success) {
        return {
          status: 'COMPILE_ERROR',
          stdout: '',
          stderr: compileResult.stderr,
          execution_time: 0,
          memory_used: 0,
        };
      }

      const runResult = await this.runSingleTestCase(
        language,
        compileResult.executablePath,
        false,
        custom_input,
        time_limit,
      );

      let status = 'ACCEPTED';
      if (runResult.isTle) {
        status = 'TIME_LIMIT_EXCEEDED';
      } else if (runResult.exitCode !== 0) {
        status = 'RUNTIME_ERROR';
      }

      return {
        status,
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        execution_time: runResult.executionTime,
        memory_used: 12, // MB (ước tính an toàn cho native run)
      };
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }

  /**
   * Chấm điểm bài nộp chính thức với toàn bộ test cases
   */
  async evaluateSubmission(payload: {
    language: string;
    language_version?: string;
    source_code: string;
    time_limit: number;
    memory_limit: number;
    test_cases: Array<{ id?: string; input: string; expected_output: string; is_hidden?: boolean }>;
  }): Promise<SubmissionEvaluationResult> {
    const { language, language_version, source_code, time_limit = 1000, memory_limit = 256, test_cases = [] } = payload;
    const tempDir = path.join(os.tmpdir(), `datn_judge_${randomUUID()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      const extMap: Record<string, string> = {
        PYTHON: 'main.py',
        CPP: 'main.cpp',
        C: 'main.c',
        JAVA: 'Main.java',
        GO: 'main.go',
        NODE: 'main.js',
      };
      const fileName = extMap[language.toUpperCase()] || 'main.py';
      fs.writeFileSync(path.join(tempDir, fileName), source_code, 'utf-8');

      // 1. Compile
      const compileResult = await this.compileCode(language, tempDir, fileName, language_version);
      if (!compileResult.success) {
        const errorResults: TestResultItem[] = test_cases.map((_, idx) => ({
          testcase_index: idx,
          status: 'COMPILE_ERROR',
          execution_time: 0,
          memory_used: 0,
          actual_output: compileResult.stderr.slice(0, 1000),
        }));
        return {
          status: 'COMPILE_ERROR',
          score: 0,
          execution_time: 0,
          memory_used: 0,
          test_results: errorResults,
        };
      }

      // 2. Chạy từng test case
      const results: TestResultItem[] = [];
      let finalStatus = 'ACCEPTED';
      let maxExecutionTime = 0;

      for (let i = 0; i < test_cases.length; i++) {
        const tc = test_cases[i];
        const res = await this.runSingleTestCase(
          language,
          compileResult.executablePath,
          false,
          tc.input,
          time_limit,
        );

        maxExecutionTime = Math.max(maxExecutionTime, res.executionTime);

        let status = 'ACCEPTED';
        if (res.isTle) {
          status = 'TIME_LIMIT_EXCEEDED';
        } else if (res.exitCode !== 0) {
          status = 'RUNTIME_ERROR';
        } else {
          const expected = (tc.expected_output || '').trim().replace(/\r\n/g, '\n');
          const actual = res.stdout.trim().replace(/\r\n/g, '\n');
          if (actual !== expected) {
            status = 'WRONG_ANSWER';
          }
        }

        results.push({
          testcase_index: i,
          status,
          execution_time: res.executionTime,
          memory_used: 12,
          actual_output: res.stdout.slice(0, 1000),
        });

        if (status !== 'ACCEPTED' && finalStatus === 'ACCEPTED') {
          finalStatus = status;
        }
      }

      const passedCount = results.filter((r) => r.status === 'ACCEPTED').length;
      const score = test_cases.length > 0 ? Math.round((passedCount / test_cases.length) * 100) : 0;

      return {
        status: finalStatus,
        score,
        execution_time: maxExecutionTime,
        memory_used: 14,
        test_results: results,
      };
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }
}
