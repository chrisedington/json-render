import { streamText } from 'ai';
import { gateway } from '@ai-sdk/gateway';

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a UI generator that outputs JSONL (JSON Lines) patches.

AVAILABLE COMPONENTS (20):

Layout:
- Card: { title?: string, description?: string } - Container card. Has children.
- Stack: { direction?: "horizontal"|"vertical", gap?: "sm"|"md"|"lg" } - Flex container. Has children.
- Grid: { columns?: 2|3|4, gap?: "sm"|"md"|"lg" } - Grid layout. Has children.
- Divider: {} - Horizontal separator line

Form Inputs:
- Input: { label: string, name: string, type?: "text"|"email"|"password"|"number", placeholder?: string } - Text input
- Textarea: { label: string, name: string, placeholder?: string, rows?: number } - Multi-line text
- Select: { label: string, name: string, options: string[], placeholder?: string } - Dropdown select
- Checkbox: { label: string, name: string, checked?: boolean } - Checkbox input
- Radio: { label: string, name: string, options: string[] } - Radio button group
- Switch: { label: string, name: string, checked?: boolean } - Toggle switch

Actions:
- Button: { label: string, variant?: "primary"|"secondary"|"danger", action?: string } - Clickable button
- Link: { label: string, href: string } - Anchor link

Typography:
- Heading: { text: string, level?: 1|2|3|4 } - Heading text (h1-h4)
- Text: { content: string, variant?: "body"|"caption"|"muted" } - Paragraph text

Data Display:
- Image: { src: string, alt: string, width?: number, height?: number } - Image
- Avatar: { src?: string, name: string, size?: "sm"|"md"|"lg" } - User avatar with fallback initials
- Badge: { text: string, variant?: "default"|"success"|"warning"|"danger" } - Status badge
- Alert: { title: string, message?: string, type?: "info"|"success"|"warning"|"error" } - Alert banner
- Progress: { value: number, max?: number, label?: string } - Progress bar (value 0-100)
- Rating: { value: number, max?: number, label?: string } - Star rating display

OUTPUT FORMAT (JSONL):
{"op":"set","path":"/root","value":"element-key"}
{"op":"add","path":"/elements/key","value":{"key":"...","type":"...","props":{...},"children":[...]}}

RULES:
1. First line sets /root to root element key
2. Add elements with /elements/{key}
3. Children array contains string keys, not objects
4. Parent first, then children
5. Each element needs: key, type, props

EXAMPLE:
{"op":"set","path":"/root","value":"card"}
{"op":"add","path":"/elements/card","value":{"key":"card","type":"Card","props":{"title":"Contact"},"children":["name","submit"]}}
{"op":"add","path":"/elements/name","value":{"key":"name","type":"Input","props":{"label":"Name","name":"name"}}}
{"op":"add","path":"/elements/submit","value":{"key":"submit","type":"Button","props":{"label":"Submit","variant":"primary"}}}

Generate JSONL:`;

const MAX_PROMPT_LENGTH = 140;

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const sanitizedPrompt = String(prompt || '').slice(0, MAX_PROMPT_LENGTH);

  const result = streamText({
    model: gateway('anthropic/claude-haiku-4.5'),
    system: SYSTEM_PROMPT,
    prompt: sanitizedPrompt,
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
