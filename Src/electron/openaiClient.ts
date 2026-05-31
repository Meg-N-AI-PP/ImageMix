import OpenAI, { toFile } from 'openai';
import type {
  GenerationRequest,
  ImprovePromptRequest
} from '../shared/types';

// OpenAI access lives only in the main process. The API key is read from the
// environment and never exposed to the renderer.

let client: OpenAI | null = null;

export function isApiKeyConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && key.trim() && key.trim() !== 'your_api_key_here');
}

function getClient(): OpenAI {
  if (!isApiKeyConfigured()) {
    throw new Error(
      'OpenAI API key is not configured. Add OPENAI_API_KEY to the .env file.'
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

function stripDataUrlPrefix(data: string): string {
  const comma = data.indexOf(',');
  return data.startsWith('data:') && comma !== -1 ? data.slice(comma + 1) : data;
}

/**
 * Generates an image. For text-to-image it uses images.generate. For fusion
 * modes that include source images it uses images.edit, which accepts one or
 * more input images plus a prompt.
 */
export async function generateImage(
  request: GenerationRequest
): Promise<string> {
  const openai = getClient();
  const size = request.size ?? '1024x1024';

  const hasImages = request.images && request.images.length > 0;

  if (hasImages) {
    const files = await Promise.all(
      request.images!.map((image, index) =>
        toFile(
          Buffer.from(stripDataUrlPrefix(image.data), 'base64'),
          image.name || `source-${index}.png`,
          { type: 'image/png' }
        )
      )
    );

    const response = await openai.images.edit({
      model: request.model,
      image: files,
      prompt: request.prompt,
      size
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error('The model did not return an image.');
    }
    return b64;
  }

  const response = await openai.images.generate({
    model: request.model,
    prompt: request.prompt,
    size,
    n: 1
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('The model did not return an image.');
  }
  return b64;
}

/**
 * Combines and/or improves several text ideas into a single image prompt.
 */
export async function improvePrompt(
  request: ImprovePromptRequest
): Promise<string> {
  const openai = getClient();
  const ideas = request.prompts
    .map((idea) => idea.trim())
    .filter(Boolean)
    .map((idea, index) => `${index + 1}. ${idea}`)
    .join('\n');

  const instruction =
    request.instruction?.trim() ||
    'Combine the following ideas into one vivid, coherent image generation prompt. Return only the final prompt text, no extra commentary.';

  const response = await openai.chat.completions.create({
    model: request.model,
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful assistant that writes concise, descriptive prompts for an image generation model.'
      },
      {
        role: 'user',
        content: `${instruction}\n\nIdeas:\n${ideas}`
      }
    ]
  });

  const text = response.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('The model did not return a combined prompt.');
  }
  return text;
}
