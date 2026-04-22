/**
 * Build a prompt containing the title, description, and optional image URL for a maintenance request.
 * The prompt is fed to the LLM as the user message.
 */
export const buildMaintenancePrompt = (
  title: string,
  description: string,
  imageUrl?: string
): string => {
  let prompt = `Title: ${title}\nDescription: ${description}`;
  if (imageUrl) {
    prompt += `\nImage URL: ${imageUrl}`;
  }
  return prompt;
};
