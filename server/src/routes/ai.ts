import { Router } from 'express';
import { answerFaq } from '../controllers/aiController';

const router = Router();

router.post('/faq', answerFaq);

export default router;
