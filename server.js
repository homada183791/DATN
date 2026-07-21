const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/run', (req, res) => {
  const { language, code, stdin } = req.body || {};

  if (!language || !code) {
    return res.status(400).send('Thiếu language hoặc code');
  }

  const tempDir = path.join(__dirname, 'tmp-run');
  fs.mkdirSync(tempDir, { recursive: true });

  const fileName = language === 'cpp' ? 'main.cpp' : 'main.py';
  const filePath = path.join(tempDir, fileName);
  const inputPath = path.join(tempDir, 'input.txt');

  fs.writeFileSync(filePath, code);
  fs.writeFileSync(inputPath, stdin || '');

  let command = '';
  let args = [];

  if (language === 'cpp') {
    command = 'g++';
    args = [filePath, '-o', path.join(tempDir, 'main')];
  } else if (language === 'python') {
    command = 'python3';
    args = [filePath];
  } else {
    return res.status(400).send('Ngôn ngữ không được hỗ trợ');
  }

  const child = spawn(command, args, { cwd: tempDir, shell: false });
  let compileStdout = '';
  let compileStderr = '';

  child.stdout.on('data', (d) => { compileStdout += d.toString(); });
  child.stderr.on('data', (d) => { compileStderr += d.toString(); });

  child.on('error', (err) => {
    res.status(500).send(`Không thể khởi chạy ${command}: ${err.message}`);
  });

  child.on('close', (code) => {
    if (language === 'cpp' && code !== 0) {
      return res.json({ compile: { code, stderr: compileStderr || compileStdout }, run: { code, stdout: '', stderr: compileStderr || compileStdout } });
    }

    const runChild = spawn(language === 'cpp' ? path.join(tempDir, 'main') : 'python3', language === 'cpp' ? [] : [filePath], { cwd: tempDir, shell: false });
    let runStdout = '';
    let runStderr = '';

    if (fs.existsSync(inputPath)) {
      const inputStream = fs.createReadStream(inputPath);
      inputStream.pipe(runChild.stdin);
    }

    runChild.stdout.on('data', (d) => { runStdout += d.toString(); });
    runChild.stderr.on('data', (d) => { runStderr += d.toString(); });

    runChild.on('close', (runCode) => {
      res.json({
        compile: { code: 0, stderr: '' },
        run: { code: runCode, stdout: runStdout, stderr: runStderr },
      });
    });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
