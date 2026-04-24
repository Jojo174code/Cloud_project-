import { PrismaClient } from '@prisma/client';
import { callAi } from '../../utils/aiClient';
import { buildFaqPrompt } from '../../utils/promptBuilders/faqPrompt';

const prisma = new PrismaClient();

/**
 * Retrieve FAQs that are relevant to the tenant question.
 * Simple relevance: case‑insensitive substring match on question or answer.
 */
export const fetchRelevantFaqs = async (question: string) => {
  const normalizedQuestion = question.toLowerCase().trim();
  const normalizedTerms = normalizedQuestion
    .split(/\s+/)
    .map(term => term.trim())
    .filter(term => term.length > 1);

  const faqs = await prisma.faqEntry.findMany({
    take: 50,
  });

  return faqs
    .map(faq => {
      const haystack = `${faq.question} ${faq.answer}`.toLowerCase();
      let score = 0;

      if (haystack.includes(normalizedQuestion)) {
        score += 10;
      }

      for (const term of normalizedTerms) {
        if (haystack.includes(term)) {
          score += 2;
        }
      }

      return { faq, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(entry => entry.faq);
};

/**
 * Given a tenant question, produce a safe answer.
 * If no relevant FAQs are found we return a fallback string.
 */
const FALLBACK_FAQ_RESPONSE = 'I could not confirm that from the current property information. Please contact management for clarification.';

const answerFromFaqs = (faqs: { answer: string }[]) => {
  const firstAnswer = faqs[0]?.answer?.trim();
  return firstAnswer && firstAnswer.length > 0 ? firstAnswer : FALLBACK_FAQ_RESPONSE;
};

export const answerTenantQuestion = async (question: string): Promise<string> => {
  const faqs = await fetchRelevantFaqs(question);
  if (faqs.length === 0) {
    return FALLBACK_FAQ_RESPONSE;
  }

  if (!process.env.AI_API_KEY) {
    return answerFromFaqs(faqs);
  }

  const prompt = buildFaqPrompt(question, faqs);

  try {
    const aiResponse = await callAi({
      model: process.env.AI_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: 'You are a helpful property‑management assistant. Answer the tenant question based ONLY on the provided FAQ entries. Do not hallucinate information. Keep the answer concise and friendly.' },
                 { role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const answer = aiResponse.content.trim();
    return answer.length > 0 ? answer : answerFromFaqs(faqs);
  } catch (error) {
    return answerFromFaqs(faqs);
  }
};
