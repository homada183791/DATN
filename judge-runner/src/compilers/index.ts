export type Language = 'C' | 'CPP' | 'PYTHON' | 'GO' | 'JAVA';

export interface CompilerConfig {
  filename: string;
  compileCmd?: string;
  runCmd: string;
}

export const compilers: Record<Language, CompilerConfig> = {
  C: {
    filename: 'main.c',
    compileCmd: 'gcc -O2 main.c -o main',
    runCmd: './main',
  },
  CPP: {
    filename: 'main.cpp',
    compileCmd: 'g++ -O2 main.cpp -o main',
    runCmd: './main',
  },
  PYTHON: {
    filename: 'main.py',
    runCmd: 'python3 main.py',
  },
  GO: {
    filename: 'main.go',
    compileCmd: 'go build -o main main.go',
    runCmd: './main',
  },
  JAVA: {
    filename: 'Main.java',
    compileCmd: 'javac Main.java',
    runCmd: 'java Main',
  },
};
