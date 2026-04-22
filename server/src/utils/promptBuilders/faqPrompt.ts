/**
 * Build a prompt for the FAQ assistant.
 * It includes the tenant question and a numbered list of FAQ entries.
 */
export const buildFaqPrompt = (
  question: string,
  faqs: { question: string; answer: string }[]
): string => {
  const faqLines = faqs
    .map((f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer}`)
    .join('\n');
  return `Tenant question: "${question}"\n\nRelevant FAQ entries:\n${faqLines}\n\nProvide a concise, friendly answer using ONLY the above information. If you cannot answer, respond with the fallback sentence exactly.`;
};
