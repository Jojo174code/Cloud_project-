import { PrismaClient, RequestStatus } from '@prisma/client';
import { callAi } from '../../utils/aiClient';
import { buildMaintenancePrompt } from '../../utils/promptBuilders/maintenancePrompt';

const prisma = new PrismaClient();

/**
 * Emergency keywords that force high priority / escalation.
 */
const EMERGENCY_KEYWORDS = [
  'leak',
  'leaking',
  'flood',
  'flooding',
  'spark',
  'sparks',
  'smoke',
  'smoked',
  'gas smell',
  'gas odor',
  'no heat',
  'broken lock',
  'sewage',
  'sewage backup',
  'backup',
];

/**
 * Run the LLM to triage a maintenance request.
 * Returns an object matching the required shape.
 */
export const triageMaintenance = async (
  title: string,
  description: string,
  imageUrl?: string
): Promise<{
  category: string;
  priority: string;
  summary: string;
  recommended_action: string;
  response_draft: string;
  escalated: boolean;
  confidence: number;
}> => {
  const prompt = buildMaintenancePrompt(title, description, imageUrl);

  const aiResponse = await callAi({
    model: process.env.AI_MODEL || 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: `You are an AI assistant that triages maintenance requests for a property management platform. Respond ONLY with a JSON object matching the following schema (do NOT include any extra text):\n${JSON.stringify(
        {
          category:
            'plumbing | electrical | HVAC | appliances | pest_control | structural | locks_security | general | other',
          priority: 'low | medium | high | emergency',
          summary: 'Short one‑sentence issue summary',
          recommended_action:
            'Specific next step recommendation',
          response_draft:
            'Short tenant‑facing response',
          escalated: true,
          confidence: 0.0,
        },
        null,
        2
      )}\n\nIf any emergency keyword from the following list appears in the request, you must set \"priority\" to \"high\" or \"emergency\" (choose \"emergency\" when the situation is life‑threatening) and set \"escalated\" to true. The response_draft should reflect urgency.\nEmergency keywords: ${EMERGENCY_KEYWORDS.join(', ')}\n\nOtherwise, choose the appropriate category and a priority of low, medium, or high. Confidence should be a float between 0 and 1 representing your certainty.` },
      { role: 'user', content: prompt },
    ],
    temperature: 0.0,
  });

  // The AI should return pure JSON. Try to parse safely.
  let parsed: any;
  try {
    parsed = JSON.parse(aiResponse.content);
  } catch (e) {
    // Fallback: very safe minimal response
    parsed = {
      category: 'general',
      priority: 'low',
      summary: title,
      recommended_action: 'Inspect the issue and contact the tenant for more details.',
      response_draft: 'We have received your request and will review it shortly.',
      escalated: false,
      confidence: 0.5,
    };
  }

  // Ensure all fields exist and have correct types; coerce where needed.
  return {
    category: parsed.category || 'general',
    priority: parsed.priority || 'low',
    summary: parsed.summary || title,
    recommended_action: parsed.recommended_action || 'Please investigate.',
    response_draft: parsed.response_draft || 'We have received your request.',
    escalated: !!parsed.escalated,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
  };
};
