import { callAi } from '../../utils/aiClient';
import { buildFinancePrompt } from '../../utils/promptBuilders/financePrompt';

interface FinanceAiInput {
  monthLabel: string;
  expectedRent: number;
  collectedRent: number;
  outstandingRent: number;
  overdueRent: number;
  collectionRate: number;
  maintenanceCount: number;
  maintenanceCostPlaceholder: number;
  netCashFlowEstimate: number;
  overdueTenants: Array<{
    tenantName: string;
    propertyName: string;
    amountDue: number;
    daysLate: number;
  }>;
}

export interface FinanceAiSummaryResult {
  source: 'ai' | 'fallback';
  summary: string;
  collection_performance: string;
  overdue_risk: string;
  cash_flow_warning: string;
  recommended_actions: string[];
  rent_reminder_draft?: string;
}

const fallbackFinanceSummary = (input: FinanceAiInput): FinanceAiSummaryResult => {
  const strongCollection = input.collectionRate >= 95;
  const healthyCashFlow = input.netCashFlowEstimate >= 0;
  const topOverdueTenant = [...input.overdueTenants].sort((a, b) => b.amountDue - a.amountDue)[0];

  const recommendedActions = [
    input.overdueRent > 0
      ? 'Follow up with overdue tenants within 24 hours and confirm expected payment dates.'
      : 'Maintain the current rent collection cadence and keep payment records current.',
    input.outstandingRent > 0
      ? 'Review unpaid or partial rent entries and update statuses after each manual payment confirmation.'
      : 'Use the clean collection position to plan the next maintenance and reserve allocation.',
    input.maintenanceCount > 0
      ? 'Monitor active maintenance work orders because placeholder costs are reducing near-term cash flow.'
      : 'Keep maintenance reserve assumptions in mind, even with a light work-order load.',
  ];

  return {
    source: 'fallback',
    summary: `Collected $${input.collectedRent.toFixed(2)} of $${input.expectedRent.toFixed(2)} due for ${input.monthLabel}, a ${input.collectionRate.toFixed(1)}% collection rate. Outstanding rent is $${input.outstandingRent.toFixed(2)} and overdue rent totals $${input.overdueRent.toFixed(2)}. Net cash flow is estimated at $${input.netCashFlowEstimate.toFixed(2)} after applying placeholder maintenance costs.`,
    collection_performance: strongCollection
      ? 'Collection performance is strong and most expected rent has already been captured.'
      : 'Collection performance needs attention because a meaningful share of this month’s rent is still outstanding.',
    overdue_risk: input.overdueRent > 0
      ? `Overdue exposure is elevated${topOverdueTenant ? `, led by ${topOverdueTenant.tenantName} at ${topOverdueTenant.propertyName}` : ''}.`
      : 'Overdue risk is currently low because there are no overdue balances on record.',
    cash_flow_warning: healthyCashFlow
      ? 'Cash flow remains positive on the current placeholder maintenance assumptions.'
      : 'Cash flow is under pressure because collected rent is not fully covering current placeholder maintenance costs.',
    recommended_actions: recommendedActions,
    rent_reminder_draft: topOverdueTenant
      ? `Hi ${topOverdueTenant.tenantName}, this is a reminder that your rent balance of $${topOverdueTenant.amountDue.toFixed(2)} for ${topOverdueTenant.propertyName} is overdue. Please reply with your expected payment date so we can update the account notes.`
      : 'Hi there, this is a friendly reminder to confirm this month’s rent payment status. Please reply with any timing update so we can keep your account accurate.',
  };
};

export const generateFinanceAiSummary = async (
  input: FinanceAiInput
): Promise<FinanceAiSummaryResult> => {
  const prompt = buildFinancePrompt(input);

  try {
    const aiResponse = await callAi({
      model: process.env.AI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an AI financial operations assistant for a property manager. Respond ONLY with valid JSON. Do not reveal chain-of-thought. Keep the response concise and business-friendly. Use this schema exactly:\n${JSON.stringify(
            {
              summary: 'Brief business summary',
              collection_performance: 'Short assessment of collection performance',
              overdue_risk: 'Short overdue risk assessment',
              cash_flow_warning: 'Short cash-flow assessment',
              recommended_actions: ['Action 1', 'Action 2'],
              rent_reminder_draft: 'Optional tenant reminder draft',
            },
            null,
            2
          )}`,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    });

    const parsed = JSON.parse(aiResponse.content);
    return {
      source: 'ai',
      summary: parsed.summary || fallbackFinanceSummary(input).summary,
      collection_performance:
        parsed.collection_performance || fallbackFinanceSummary(input).collection_performance,
      overdue_risk: parsed.overdue_risk || fallbackFinanceSummary(input).overdue_risk,
      cash_flow_warning:
        parsed.cash_flow_warning || fallbackFinanceSummary(input).cash_flow_warning,
      recommended_actions:
        Array.isArray(parsed.recommended_actions) && parsed.recommended_actions.length > 0
          ? parsed.recommended_actions.map((item: unknown) => String(item))
          : fallbackFinanceSummary(input).recommended_actions,
      rent_reminder_draft:
        typeof parsed.rent_reminder_draft === 'string'
          ? parsed.rent_reminder_draft
          : fallbackFinanceSummary(input).rent_reminder_draft,
    };
  } catch (error) {
    return fallbackFinanceSummary(input);
  }
};
