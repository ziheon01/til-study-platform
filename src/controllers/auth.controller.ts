import { Router, Request, Response } from 'express';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/authenticate';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from '../dtos/auth.dto';
import * as authService from '../services/auth.service';
import { sendSuccess } from '../utils/response';

const router = Router();

router.post('/register', validate(RegisterSchema), async (req: Request, res: Response) => {
  const user = await authService.register(req.body);
  sendSuccess(res, user, 201);
});

router.post('/login', validate(LoginSchema), async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  sendSuccess(res, result);
});

router.post('/logout', validate(RefreshTokenSchema), async (req: Request, res: Response) => {
  await authService.logout(req.body.refreshToken);
  sendSuccess(res, { message: '로그아웃 되었습니다' });
});

router.post('/refresh', validate(RefreshTokenSchema), async (req: Request, res: Response) => {
  const result = await authService.refresh(req.body.refreshToken);
  sendSuccess(res, result);
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await authService.getMe(req.userId!);
  sendSuccess(res, user);
});

export default router;
