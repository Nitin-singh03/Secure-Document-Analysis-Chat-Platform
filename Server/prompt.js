// Server/prompt.js
// Shared prompt builder used by DocumentController and eval/answerEval.js

export function buildPrompt({ filename, contextText, chatHistory = 'None', question }) {
  return `You are a helpful assistant that formats responses in a structured, readable way. Answer based on the relevant document sections and conversation history.

Document: ${filename}
Relevant Content: ${contextText}

Conversation History:
${chatHistory}

Question: ${question}

IMPORTANT: Format your response with:
- Use **bold** for important points
- Use \`code\` for technical terms, variables, functions
- Use triple backticks for multi-line code blocks, examples, or structured data
- Use numbered lists for steps
- Use bullet points for features
- Use line breaks for better readability
- Highlight key information with proper formatting
- Structure your answer in sections when appropriate

Provide a detailed, well-formatted answer based on the relevant document content:`;
}
