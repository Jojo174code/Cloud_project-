import { FaqEntry, PrismaClient } from '@prisma/client';
import { callAi } from '../../utils/aiClient';
import { buildFaqPrompt } from '../../utils/promptBuilders/faqPrompt';

const prisma = new PrismaClient();

const FALLBACK_FAQ_RESPONSE = 'I could not confirm that from the current property information. Please contact management for clarification.';
const MIN_RELEVANCE_SCORE = 5;
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'can',
  'do',
  'does',
  'for',
  'how',
  'i',
  'if',
  'in',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'the',
  'there',
  'to',
  'what',
  'when',
  'where',
  'who',
  'why',
  'with',
  'you',
]);

interface IntentHint {
  name: string;
  terms: string[];
  preferredCategories: string[];
}

interface LocalAssistantReply {
  answer: string;
  reason: string;
}

const INTENT_HINTS: IntentHint[] = [
  {
    name: 'rent_due',
    terms: ['rent', 'due', 'payment', 'month', 'monthly', 'first'],
    preferredCategories: ['payments'],
  },
  {
    name: 'maintenance_submit',
    terms: ['maintenance', 'request', 'submit', 'dashboard', 'issue', 'repair'],
    preferredCategories: ['maintenance'],
  },
  {
    name: 'emergency',
    terms: ['emergency', 'urgent', 'flooding', 'flood', 'gas', 'smell', 'sparks', 'lock', 'locks'],
    preferredCategories: ['emergency', 'maintenance'],
  },
  {
    name: 'office_hours',
    terms: ['office', 'hours', 'open', 'weekday', 'monday', 'friday'],
    preferredCategories: ['office'],
  },
  {
    name: 'request_chat',
    terms: ['chat', 'message', 'contact', 'management', 'manager'],
    preferredCategories: ['communication', 'maintenance'],
  },
];

const GREETING_PATTERN = /^(hi|hello|hey|yo|good morning|good afternoon|good evening)(?:\s+there)?[!.?]*$/i;
const CAPABILITIES_PATTERN = /^(what can you do|help|who are you|what do you do|how can you help|what can you help with)[?.!]*$/i;
const MAINTENANCE_GUIDANCE_TERMS = [
  'leak',
  'leaking',
  'water heater',
  'heater',
  'flood',
  'flooding',
  'drip',
  'pipe',
  'toilet',
  'sink',
  'hvac',
  'no heat',
  'no hot water',
  'smell gas',
  'gas smell',
  'spark',
  'smoke',
  'broken lock',
  'lock broken',
  'door lock',
  'maintenance',
  'repair',
  'noise',
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const tokenize = (value: string) =>
  normalize(value)
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));

const getIntentHints = (question: string) => {
  const normalized = normalize(question);
  return INTENT_HINTS.filter(intent => intent.terms.some(term => normalized.includes(term)));
};

const getLocalAssistantReply = (question: string): LocalAssistantReply | null => {
  const trimmed = question.trim();
  const normalized = normalize(trimmed);

  if (GREETING_PATTERN.test(trimmed)) {
    return {
      answer:
        'Hi, I’m LeasePilot Assistant. I can help with rent questions, maintenance requests, emergency guidance, and contacting management.',
      reason: 'greeting',
    };
  }

  if (CAPABILITIES_PATTERN.test(trimmed)) {
    return {
      answer:
        'I can help you understand rent due dates, submit maintenance requests, identify emergencies, and contact your property manager through request chat.',
      reason: 'capabilities',
    };
  }

  if (MAINTENANCE_GUIDANCE_TERMS.some(term => normalized.includes(term))) {
    return {
      answer:
        'That sounds like a maintenance issue. Please submit a maintenance request from your tenant dashboard with the details, and if there is active leaking or another urgent safety risk, report it right away and follow any immediate safety steps you can take safely.',
      reason: 'maintenance_guidance',
    };
  }

  return null;
};

const scoreFaq = (faq: FaqEntry, question: string) => {
  const normalizedQuestion = normalize(question);
  const questionTokens = tokenize(question);
  const haystack = normalize(`${faq.question} ${faq.answer} ${faq.category || ''}`);
  let score = 0;

  if (haystack.includes(normalizedQuestion)) {
    score += 14;
  }

  for (const token of questionTokens) {
    if (haystack.includes(token)) {
      score += 3;
    }
  }

  const intents = getIntentHints(question);
  for (const intent of intents) {
    if (intent.preferredCategories.includes((faq.category || '').toLowerCase())) {
      score += 5;
    }
    if (intent.terms.some(term => haystack.includes(term))) {
      score += 2;
    }
  }

  if (normalize(faq.question).includes(normalizedQuestion)) {
    score += 8;
  }

  return score;
};

export const fetchRelevantFaqs = async (question: string) => {
  const faqs = await prisma.faqEntry.findMany({
    take: 100,
    orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }],
  });

  return faqs
    .map(faq => ({ faq, score: scoreFaq(faq, question) }))
    .filter(entry => entry.score >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
};

const answerFromFaqs = (faqs: FaqEntry[]) => {
  const firstAnswer = faqs[0]?.answer?.trim();
  return firstAnswer && firstAnswer.length > 0 ? firstAnswer : FALLBACK_FAQ_RESPONSE;
};

export const answerTenantQuestion = async (question: string): Promise<string> => {
  const localReply = getLocalAssistantReply(question);
  if (localReply) {
    console.info(`[FAQ AI] mode=local reason=${localReply.reason} question=${JSON.stringify(question)}`);
    return localReply.answer;
  }

  const matches = await fetchRelevantFaqs(question);
  const faqs = matches.map(match => match.faq);

  if (faqs.length === 0) {
    console.info(`[FAQ AI] mode=fallback reason=no_match question=${JSON.stringify(question)}`);
    return FALLBACK_FAQ_RESPONSE;
  }

  const deterministicAnswer = answerFromFaqs(faqs);

  if (!process.env.AI_API_KEY) {
    console.info(`[FAQ AI] mode=deterministic reason=no_api_key question=${JSON.stringify(question)} matched=${faqs.length}`);
    return deterministicAnswer;
  }

  const prompt = buildFaqPrompt(question, faqs);

  try {
    const aiResponse = await callAi({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful property-management assistant. Answer the tenant question using only the provided FAQ entries. If the FAQs do not answer the question, reply with the fallback sentence exactly. Keep the answer concise, clear, and friendly.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    });

    const answer = aiResponse.content.trim();
    const finalAnswer = answer.length > 0 ? answer : deterministicAnswer;
    console.info(`[FAQ AI] mode=openai question=${JSON.stringify(question)} matched=${faqs.length}`);
    return finalAnswer;
  } catch (error) {
    console.warn(`[FAQ AI] mode=deterministic reason=openai_failed question=${JSON.stringify(question)} error=${error instanceof Error ? error.message : 'unknown'}`);
    return deterministicAnswer;
  }
};
