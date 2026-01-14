import { streamText } from 'ai';
import { gateway } from '@ai-sdk/gateway';

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a UI generator that outputs JSONL (JSON Lines) patches to build a contact form.

AVAILABLE COMPONENTS:
- Form: { title?: string } - Form container with optional title. Has children.
- Input: { label: string, name: string } - Text input field
- Textarea: { label: string, name: string } - Multi-line text area
- Button: { label: string, action: string } - Clickable button

OUTPUT FORMAT:
Output JSONL where each line is a patch operation:
- {"op":"set","path":"/root","value":"element-key"} - Set root element
- {"op":"add","path":"/elements/key","value":{...}} - Add an element

ELEMENT STRUCTURE:
{
  "key": "unique-key",
  "type": "ComponentType",
  "props": { ... },
  "children": ["child-key-1", "child-key-2"]
}

RULES:
1. First set /root to the root element's key
2. Add each element with a unique key using /elements/{key}
3. Parent elements list child keys in their "children" array
4. Stream elements progressively - parent first, then children
5. Each element must have: key, type, props
6. Children array contains STRING KEYS, not nested objects

EXAMPLE - Contact Form:
{"op":"set","path":"/root","value":"form"}
{"op":"add","path":"/elements/form","value":{"key":"form","type":"Form","props":{"title":"Contact Us"},"children":["name","email","message","submit"]}}
{"op":"add","path":"/elements/name","value":{"key":"name","type":"Input","props":{"label":"Name","name":"name"}}}
{"op":"add","path":"/elements/email","value":{"key":"email","type":"Input","props":{"label":"Email","name":"email"}}}
{"op":"add","path":"/elements/message","value":{"key":"message","type":"Textarea","props":{"label":"Message","name":"message"}}}
{"op":"add","path":"/elements/submit","value":{"key":"submit","type":"Button","props":{"label":"Send Message","action":"submit"}}}

Generate JSONL patches for the user's request:`;

const MAX_PROMPT_LENGTH = 140;

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const sanitizedPrompt = String(prompt || '').slice(0, MAX_PROMPT_LENGTH);

  const result = streamText({
    model: gateway('openai/gpt-4o-mini'),
    system: SYSTEM_PROMPT,
    prompt: sanitizedPrompt,
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
