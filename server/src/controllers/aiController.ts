import { Request, Response } from 'express';
import { answerTenantQuestion } from '../services/ai/faqAssistant';

// POST /api/ai/faq
export const answerFaq = async (req: Request, res: Response) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ message: 'question is required' });
  }
  try {
    const answer = await answerTenantQuestion(question);
    res.json({ answer });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'AI error' });
  }
};
