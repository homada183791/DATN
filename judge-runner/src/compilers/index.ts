export type Language = 'C' | 'CPP' | 'PYTHON' | 'GO' | 'JAVA' | 'NODE';

export interface CompilerConfig {
  filename: string;
  compileCmd?: string;
  runCmd: string;
}

export const compilers: Record<Language, CompilerConfig> = {
  C: {
    filename: 'main.c',
    compileCmd: 'gcc -O2 -std=c11 main.c -o main',
    runCmd: './main',
  },
  CPP: {
    filename: 'main.cpp',
    compileCmd: 'g++ -O2 -std=c++17 main.cpp -o main',
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
  NODE: {
    filename: 'main.js',
    runCmd: 'node main.js',
  },
};

export function getCompilerConfig(language: string, version?: string): CompilerConfig {
  const langKey = (language || 'CPP').toUpperCase() as Language;
  const base = compilers[langKey] || compilers.CPP;
  const ver = (version || '').toUpperCase();

  if (langKey === 'CPP' || ver.includes('CPP')) {
    let std = '-std=c++17';
    if (ver.includes('11')) std = '-std=c++11';
    else if (ver.includes('14')) std = '-std=c++14';
    else if (ver.includes('20')) std = '-std=c++20';
    return {
      filename: 'main.cpp',
      compileCmd: `g++ -O2 ${std} main.cpp -o main`,
      runCmd: './main',
    };
  }

  if (langKey === 'C' || ver.startsWith('C')) {
    let std = '-std=c11';
    if (ver.includes('99')) std = '-std=c99';
    return {
      filename: 'main.c',
      compileCmd: `gcc -O2 ${std} main.c -o main`,
      runCmd: './main',
    };
  }

  return base;
}
