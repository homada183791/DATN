import express, { Request, Response } from 'express';
import { DockerRunner } from './docker/docker-runner';
import { JudgeConsumer } from './consumer';

const app = express();
const PORT = process.env.PORT || 4000;

app.get('/', (_req: Request, res: Response) => {
  res.send('Judge Runner API is running!');
});

async function bootstrap() {
  await DockerRunner.pullSandboxImage();
  await JudgeConsumer.start();
  
  app.listen(PORT, () => {
    console.log(`🚀 Judge Runner API listening on port ${PORT}`);
  });
}

bootstrap();
