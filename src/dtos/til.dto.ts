import { z } from 'zod';

const VALID_CATEGORIES = ['CS', 'ALGORITHM', 'BACKEND', 'FRONTEND', 'ETC'] as const;

export const CreateTilSchema = z.object({
  title: z.string().min(1, 'title은 필수입니다'),
  content: z.string().min(1, 'content는 필수입니다'),
  category: z.enum(VALID_CATEGORIES).optional().default('ETC'),
});

export const UpdateTilSchema = z
  .object({
    title: z.string().min(1, 'title은 필수입니다'),
    content: z.string().min(1, 'content는 필수입니다'),
    category: z.enum(VALID_CATEGORIES),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: '수정할 필드를 하나 이상 제공해야 합니다',
  });

export type CreateTilInput = z.infer<typeof CreateTilSchema>;
export type UpdateTilInput = z.infer<typeof UpdateTilSchema>;

export interface TilResponse {
  id: string;
  userId: string;
  date: string; // 'YYYY-MM-DD'
  title: string;
  content: string;
  category: (typeof VALID_CATEGORIES)[number];
  createdAt: Date;
  updatedAt: Date;
}
