import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 4000;

app.get('/', (_req: Request, res: Response) => {
  res.send('Judge Runner API is running!');
});

app.listen(PORT, () => {
  console.log(`🚀 Judge Runner API listening on port ${PORT}`);
});
