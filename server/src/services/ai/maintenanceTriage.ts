import { callAi } from '../../utils/aiClient';
import { buildMaintenancePrompt } from '../../utils/promptBuilders/maintenancePrompt';

export interface TriageResult {
  category: string;
  priority: string;
  summary: string;
  recommended_action: string;
  response_draft: string;
  escalated: boolean;
  confidence: number;
}

const fallbackTriage = (title: string, description: string): TriageResult => {
  const text = `${title} ${description}`.toLowerCase();

  if (
    text.includes('spark') ||
    text.includes('smoke') ||
    text.includes('gas smell') ||
    text.includes('gas odor')
  ) {
    return {
      category: 'electrical',
      priority: 'emergency',
      summary: 'Potential fire or gas hazard reported.',
      recommended_action: 'Dispatch emergency maintenance immediately and advise the tenant to move to safety if needed.',
      response_draft: 'We received your urgent report and are escalating it immediately. If you smell gas or see smoke, leave the area and call emergency services.',
      escalated: true,
      confidence: 0.98,
    };
  }

  if (text.includes('flood') || text.includes('flooding') || text.includes('sewage backup')) {
    return {
      category: 'plumbing',
      priority: 'emergency',
      summary: 'Active flooding or severe wastewater issue reported.',
      recommended_action: 'Send emergency plumbing support immediately and instruct the tenant to shut off water if possible.',
      response_draft: 'This sounds urgent. We are escalating it now. If safe to do so, shut off the water source and avoid the affected area.',
      escalated: true,
      confidence: 0.96,
    };
  }

  if (text.includes('leak') || text.includes('leaking') || text.includes('water leak')) {
    return {
      category: 'plumbing',
      priority: 'high',
      summary: 'Water leak reported in the unit.',
      recommended_action: 'Prioritize plumbing inspection today and ask the tenant for photos if available.',
      response_draft: 'Thanks for reporting this. We are treating the leak as a high-priority issue and will follow up as soon as possible.',
      escalated: true,
      confidence: 0.92,
    };
  }

  if (
    text.includes('no heat') ||
    text.includes('no hot water') ||
    text.includes('water heater out') ||
    text.includes('heater out')
  ) {
    return {
      category: 'HVAC',
      priority: 'high',
      summary: 'Heating or hot water outage reported.',
      recommended_action: 'Schedule urgent HVAC or water-heater inspection and confirm building-wide impact.',
      response_draft: 'We received your report and marked it high priority so the team can respond quickly.',
      escalated: true,
      confidence: 0.9,
    };
  }

  if (text.includes('lock broken') || text.includes('broken lock') || text.includes('lock is broken') || text.includes('door lock')) {
    return {
      category: 'locks_security',
      priority: 'high',
      summary: 'Broken lock or security-related access issue reported.',
      recommended_action: 'Prioritize locksmith or maintenance dispatch to secure the property.',
      response_draft: 'We are treating this as a high-priority security issue and will follow up quickly.',
      escalated: true,
      confidence: 0.9,
    };
  }

  if (text.includes('outlet') || text.includes('appliance') || text.includes('fridge') || text.includes('oven')) {
    return {
      category: 'appliances',
      priority: 'medium',
      summary: 'Appliance or electrical fixture issue reported.',
      recommended_action: 'Queue standard maintenance review and confirm whether the issue is worsening.',
      response_draft: 'Thanks, we received your request and will review it with the maintenance team shortly.',
      escalated: false,
      confidence: 0.75,
    };
  }

  return {
    category: 'general',
    priority: 'low',
    summary: title,
    recommended_action: 'Review the request and schedule routine maintenance follow-up.',
    response_draft: 'We received your maintenance request and will review it shortly.',
    escalated: false,
    confidence: 0.65,
  };
};

/**
 * Run the LLM to triage a maintenance request.
 * Returns an object matching the required shape.
 */
export const triageMaintenance = async (
  title: string,
  description: string,
  imageUrl?: string
): Promise<TriageResult> => {
  const prompt = buildMaintenancePrompt(title, description, imageUrl);

  try {
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
        )}` },
        { role: 'user', content: prompt },
      ],
      temperature: 0.0,
    });

    const parsed = JSON.parse(aiResponse.content);
    return {
      category: parsed.category || 'general',
      priority: parsed.priority || 'low',
      summary: parsed.summary || title,
      recommended_action: parsed.recommended_action || 'Please investigate.',
      response_draft: parsed.response_draft || 'We have received your request.',
      escalated: !!parsed.escalated,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
    };
  } catch (error) {
    return fallbackTriage(title, description);
  }
};
