import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  AiBrandField,
  AiCategoryField,
} from './dto/generate-brand-info.dto';
import type { AiProductField } from './dto/generate-product-info.dto';

const GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];
const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

type EntityKind = 'brand' | 'category' | 'product';
type AllFields = AiBrandField | AiCategoryField | AiProductField;

interface PromptContext {
  brandName?: string;
  categoryName?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  async generateBrandField(
    name: string,
    field: AiBrandField,
    language: 'en' | 'km' = 'en',
  ): Promise<string> {
    return this.generate('brand', name, field, language);
  }

  async generateCategoryField(
    name: string,
    field: AiCategoryField,
    language: 'en' | 'km' = 'en',
  ): Promise<string> {
    return this.generate('category', name, field, language);
  }

  async generateProductField(
    name: string,
    field: AiProductField,
    language: 'en' | 'km' = 'en',
    context?: PromptContext,
  ): Promise<string> {
    return this.generate('product', name, field, language, context);
  }

  /**
   * Generic generator — used by brand, category, and product methods.
   * Tries each model in order with retries, falling through on transient failures.
   */
  private async generate(
    kind: EntityKind,
    name: string,
    field: AllFields,
    language: 'en' | 'km',
    context?: PromptContext,
  ): Promise<string> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'GOOGLE_API_KEY is not configured on the server',
      );
    }

    const prompt = this.buildPrompt(kind, name, field, language, context);

    let lastError: Error | null = null;
    for (const model of GEMINI_MODELS) {
      try {
        const text = await this.callWithRetry(model, prompt, apiKey);
        return this.sanitizeOutput(text, field);
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Model "${model}" failed: ${lastError.message}. Trying next.`,
        );
      }
    }

    throw new ServiceUnavailableException(
      lastError?.message ??
        'AI service is currently unavailable. Please try again in a moment.',
    );
  }

  private async callWithRetry(
    model: string,
    prompt: string,
    apiKey: string,
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES + 1; attempt++) {
      if (attempt > 0) {
        await this.sleep(RETRY_DELAY_MS);
        this.logger.log(`Retry ${attempt}/${MAX_RETRIES} for model "${model}"`);
      }
      try {
        return await this.callGemini(model, prompt, apiKey);
      } catch (error) {
        lastError = error as Error;
        const status = (error as { statusCode?: number }).statusCode;
        if (status && status !== 503 && status !== 429) {
          throw error;
        }
      }
    }

    throw (
      lastError ??
      new Error(`All ${MAX_RETRIES + 1} attempts to ${model} failed`)
    );
  }

  private async callGemini(
    model: string,
    prompt: string,
    apiKey: string,
  ): Promise<string> {
    const url = `${GEMINI_BASE_URL}/${model}:generateContent`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });
    } catch (error) {
      this.logger.error(`Network error reaching Gemini (${model})`, error);
      throw new BadGatewayException('Failed to reach the AI service');
    }

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      this.logger.error(
        `Gemini (${model}) returned ${response.status}: ${JSON.stringify(data)}`,
      );
      const message =
        data?.error?.message ?? `AI service returned status ${response.status}`;
      const err = new Error(message) as Error & { statusCode: number };
      err.statusCode = response.status;
      throw err;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      this.logger.warn(`Empty response from Gemini (${model})`);
      throw new BadGatewayException('AI service returned an empty response');
    }
    return text;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildPrompt(
    kind: EntityKind,
    name: string,
    field: AllFields,
    language: 'en' | 'km',
    context?: PromptContext,
  ): string {
    const langInstruction =
      language === 'km'
        ? 'Write the response in Khmer (ភាសាខ្មែរ).'
        : 'Write the response in English.';

    // ----- BRAND: website URL lookup -----
    if (field === 'websiteUrl') {
      return [
        `What is the official website URL for the brand "${name}"?`,
        'Return ONLY the URL itself, starting with https://, nothing else.',
        'No markdown, no quotes, no explanation, no trailing punctuation.',
        'If you are not sure or no official website exists, respond with exactly: UNKNOWN',
      ].join('\n');
    }

    // ----- PRODUCT -----
    if (kind === 'product') {
      const contextParts: string[] = [];
      if (context?.brandName) {
        contextParts.push(`by the brand "${context.brandName}"`);
      }
      if (context?.categoryName) {
        contextParts.push(`in the "${context.categoryName}" category`);
      }
      const contextPhrase =
        contextParts.length > 0 ? ` ${contextParts.join(', ')}` : '';

      if (field === 'details') {
        return [
          `Write detailed product information for "${name}"${contextPhrase}.`,
          'Write 3 to 5 short factual sentences covering likely materials, construction, care, and notable features.',
          'Each sentence must end with a period. Be specific and informative.',
          'Avoid marketing fluff and superlatives. If exact specs are unknown, describe typical characteristics for this kind of product.',
          langInstruction,
          'Return ONLY the details text, no markdown, no quotes, no labels.',
        ].join('\n');
      }

      // field === 'description'
      return [
        `Write a concise product description for "${name}"${contextPhrase}.`,
        'Write exactly 2 to 3 complete sentences. Each sentence must end with a period.',
        'Describe what the product is, its key appeal, and who it suits.',
        'Keep it factual and appealing without exaggerated marketing claims or superlatives.',
        langInstruction,
        'Return ONLY the description text, no markdown, no quotes, no labels.',
      ].join('\n');
    }

    // ----- BRAND: description -----
    if (kind === 'brand') {
      return [
        `Write a brief, factual description for the brand "${name}".`,
        'Write exactly 2 complete sentences. Each sentence must end with a period.',
        'Focus on what the brand sells, its country of origin, and founding year if known.',
        'Avoid marketing fluff, superlatives, or promotional language.',
        langInstruction,
        'Return ONLY the description text, no markdown, no quotes, no labels.',
      ].join('\n');
    }

    // ----- CATEGORY: description -----
    return [
      `Write a brief description for an e-commerce product category called "${name}".`,
      'Write exactly 2 complete sentences. Each sentence must end with a period.',
      'Describe what types of products this category contains and who might shop for them.',
      'Keep the tone neutral and informative — avoid marketing fluff and superlatives.',
      langInstruction,
      'Return ONLY the description text, no markdown, no quotes, no labels.',
    ].join('\n');
  }

  private sanitizeOutput(text: string, field: AllFields): string {
    let cleaned = text.trim();

    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    cleaned = cleaned
      .replace(/^```[a-z]*\s*/i, '')
      .replace(/```$/, '')
      .trim();

    if (field === 'websiteUrl') {
      if (cleaned.toUpperCase() === 'UNKNOWN') {
        return '';
      }
      if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
        return '';
      }
      cleaned = cleaned.replace(/[.,;!?]+$/, '');
    }

    return cleaned;
  }
}
