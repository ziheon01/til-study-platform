import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('유효한 이메일 형식이 아닙니다'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
  nickname: z.string().min(1, 'nickname은 필수입니다'),
});

export const LoginSchema = z.object({
  email: z.string().email('유효한 이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호는 필수입니다'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken은 필수입니다'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export interface UserResponse {
  id: string;
  email: string;
  nickname: string;
  createdAt: Date;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    nickname: string;
  };
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
