import { AppError } from '../middlewares/errors';
import * as taskRepo from '../repositories/task.repository';
import { CreateTaskInput, UpdateTaskInput, TaskResponse } from '../dtos/task.dto';

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toTaskResponse(task: {
  id: string;
  userId: string;
  date: Date;
  title: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TaskResponse {
  return { ...task, date: toDateString(task.date) };
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseDateUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<TaskResponse> {
  const date = input.date ? parseDateUTC(input.date) : todayUTC();
  const task = await taskRepo.createTask({ userId, date, title: input.title });
  return toTaskResponse(task);
}

export async function getTasks(userId: string, dateStr: string): Promise<TaskResponse[]> {
  const date = parseDateUTC(dateStr);
  const tasks = await taskRepo.findTasksByUserIdAndDate(userId, date);
  return tasks.map(toTaskResponse);
}

async function findOwnedTask(userId: string, id: string) {
  const task = await taskRepo.findTaskById(id);
  if (!task) {
    throw new AppError(404, 'TASK_NOT_FOUND', '태스크를 찾을 수 없습니다');
  }
  if (task.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', '접근 권한이 없습니다');
  }
  return task;
}

export async function updateTask(
  userId: string,
  id: string,
  input: UpdateTaskInput,
): Promise<TaskResponse> {
  await findOwnedTask(userId, id);
  const updated = await taskRepo.updateTask(id, { title: input.title });
  return toTaskResponse(updated);
}

export async function toggleComplete(userId: string, id: string): Promise<TaskResponse> {
  const task = await findOwnedTask(userId, id);
  const updated = await taskRepo.updateTask(id, { isCompleted: !task.isCompleted });
  return toTaskResponse(updated);
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  await findOwnedTask(userId, id);
  await taskRepo.deleteTask(id);
}
