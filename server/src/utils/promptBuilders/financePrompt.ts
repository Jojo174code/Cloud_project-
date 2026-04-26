interface FinancePromptInput {
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

export const buildFinancePrompt = (input: FinancePromptInput) => {
  const overdueLines = input.overdueTenants.length
    ? input.overdueTenants
        .map(
          (tenant) =>
            `- ${tenant.tenantName} at ${tenant.propertyName}: $${tenant.amountDue.toFixed(2)} overdue, ${tenant.daysLate} days late`
        )
        .join('\n')
    : '- No overdue tenants this month';

  return `Prepare a concise property management cash-flow summary for ${input.monthLabel}.

Expected rent: $${input.expectedRent.toFixed(2)}
Collected rent: $${input.collectedRent.toFixed(2)}
Outstanding rent: $${input.outstandingRent.toFixed(2)}
Overdue rent: $${input.overdueRent.toFixed(2)}
Collection rate: ${input.collectionRate.toFixed(1)}%
Maintenance count: ${input.maintenanceCount}
Maintenance placeholder cost: $${input.maintenanceCostPlaceholder.toFixed(2)}
Net cash flow estimate: $${input.netCashFlowEstimate.toFixed(2)}

Overdue tenants:
${overdueLines}

Return a concise business explanation only.`;
};
