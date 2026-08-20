import express from 'express';

const app = express();
const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send('Judge Runner API is running!');
});

app.listen(PORT, () => {
  console.log(`🚀 Judge Runner API listening on port ${PORT}`);
});
