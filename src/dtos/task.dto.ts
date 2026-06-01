import { z } from 'zod';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'title은 필수입니다'),
  date: z
    .string()
    .regex(DATE_REGEX, 'date는 YYYY-MM-DD 형식이어야 합니다')
    .optional(),
});

export const UpdateTaskSchema = z
  .object({
    title: z.string().min(1, 'title은 필수입니다'),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: '수정할 필드를 하나 이상 제공해야 합니다',
  });

export const TaskDateQuerySchema = z.object({
  date: z
    .string({ error: 'date 쿼리 파라미터는 필수입니다 (YYYY-MM-DD)' })
    .regex(DATE_REGEX, 'date는 YYYY-MM-DD 형식이어야 합니다'),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type TaskDateQuery = z.infer<typeof TaskDateQuerySchema>;

export interface TaskResponse {
  id: string;
  userId: string;
  date: string; // 'YYYY-MM-DD'
  title: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
