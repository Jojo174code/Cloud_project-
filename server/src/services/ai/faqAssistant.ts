import { PrismaClient } from '@prisma/client';
import { callAi } from '../../utils/aiClient';
import { buildFaqPrompt } from '../../utils/promptBuilders/faqPrompt';

const prisma = new PrismaClient();

/**
 * Retrieve FAQs that are relevant to the tenant question.
 * Simple relevance: case‑insensitive substring match on question or answer.
 */
export const fetchRelevantFaqs = async (question: string) => {
  const term = question.toLowerCase();
  const faqs = await prisma.faqEntry.findMany({
    where: {
      OR: [
        { question: { contains: term, mode: 'insensitive' } },
        { answer: { contains: term, mode: 'insensitive' } },
      ],
    },
    take: 5, // limit to keep prompt small
  });
  return faqs;
};

/**
 * Given a tenant question, produce a safe answer.
 * If no relevant FAQs are found we return a fallback string.
 */
export const answerTenantQuestion = async (question: string): Promise<string> => {
  const faqs = await fetchRelevantFaqs(question);
  if (faqs.length === 0) {
    return 'I could not confirm that from the current property information. Please contact management for clarification.';
  }

  const prompt = buildFaqPrompt(question, faqs);

  const aiResponse = await callAi({
    model: process.env.AI_MODEL || 'gpt-3.5-turbo',
    messages: [{ role: 'system', content: 'You are a helpful property‑management assistant. Answer the tenant question based ONLY on the provided FAQ entries. Do not hallucinate information. Keep the answer concise and friendly.' },
               { role: 'user', content: prompt }],
    temperature: 0.2,
  });

  // The provider should return plain text answer.
  return aiResponse.content.trim();
};
