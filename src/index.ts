import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRouter from './controllers/auth.controller';
import tilRouter from './controllers/til.controller';
import taskRouter from './controllers/task.controller';
import statsRouter from './controllers/stats.controller';
import { errorHandler } from './middlewares/errors';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/tils', tilRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/stats', statsRouter);

app.use(errorHandler);

const PORT = process.env.PORT ?? 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
