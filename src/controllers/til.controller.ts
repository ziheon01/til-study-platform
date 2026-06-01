import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { CreateTilSchema, UpdateTilSchema } from '../dtos/til.dto';
import * as tilService from '../services/til.service';
import { sendSuccess } from '../utils/response';

const router = Router();

router.use(authenticate);

router.post('/', validate(CreateTilSchema), async (req: Request, res: Response) => {
  const til = await tilService.createTil(req.userId!, req.body);
  sendSuccess(res, til, 201);
});

router.get('/', async (req: Request, res: Response) => {
  const tils = await tilService.getTils(req.userId!);
  sendSuccess(res, tils);
});

router.get('/:id', async (req: Request, res: Response) => {
  const til = await tilService.getTilById(req.userId!, String(req.params.id));
  sendSuccess(res, til);
});

router.patch('/:id', validate(UpdateTilSchema), async (req: Request, res: Response) => {
  const til = await tilService.updateTil(req.userId!, String(req.params.id), req.body);
  sendSuccess(res, til);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await tilService.deleteTil(req.userId!, String(req.params.id));
  sendSuccess(res, { message: '삭제되었습니다' });
});

export default router;
