import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/authenticate';
import * as statsService from '../services/stats.service';
import { sendSuccess } from '../utils/response';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const stats = await statsService.getStats(req.userId!);
  sendSuccess(res, stats);
});

export default router;
