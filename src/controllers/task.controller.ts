import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { validate, validateQuery } from '../middlewares/validate';
import { CreateTaskSchema, UpdateTaskSchema, TaskDateQuerySchema } from '../dtos/task.dto';
import * as taskService from '../services/task.service';
import { sendSuccess } from '../utils/response';

const router = Router();

router.use(authenticate);

router.post('/', validate(CreateTaskSchema), async (req: Request, res: Response) => {
  const task = await taskService.createTask(req.userId!, req.body);
  sendSuccess(res, task, 201);
});

router.get('/', validateQuery(TaskDateQuerySchema), async (req: Request, res: Response) => {
  const date = String(req.query.date);
  const tasks = await taskService.getTasks(req.userId!, date);
  sendSuccess(res, tasks);
});

router.patch('/:id', validate(UpdateTaskSchema), async (req: Request, res: Response) => {
  const task = await taskService.updateTask(req.userId!, String(req.params.id), req.body);
  sendSuccess(res, task);
});

router.patch('/:id/complete', async (req: Request, res: Response) => {
  const task = await taskService.toggleComplete(req.userId!, String(req.params.id));
  sendSuccess(res, task);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await taskService.deleteTask(req.userId!, String(req.params.id));
  sendSuccess(res, { message: '삭제되었습니다' });
});

export default router;
