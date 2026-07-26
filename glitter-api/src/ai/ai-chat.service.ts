import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { BranchesService } from '../branch/branch.service';
import { BrandsService } from '../brands/brands.service';
import { CategoriesService } from '../category/category.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/product.service';
import { VouchersService } from '../vouchers/vouchers.service';
import type { ProductQueryDto } from '../products/dto/product-query.dto';
import type { ChatMessageDto } from './dto/chat.dto';

const GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];
const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';

// Groq — free, no-card fallback (OpenAI-compatible) used when Gemini's free
// quota is exhausted. Set GROQ_API_KEY to enable it.
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

/** A product surfaced by the assistant, for rich cards on the storefront. */
export interface ChatProduct {
  name: string;
  price: number;
  slug: string;
  imageUrl: string | null;
}

export interface ChatResult {
  reply: string;
  products: ChatProduct[];
  /** Contextual follow-up questions the customer is likely to tap next. */
  suggestions: string[];
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

type PlanAction = 'search_products' | 'get_orders' | 'none';
type PlanSort = 'cheapest' | 'expensive' | 'newest' | null;
interface Plan {
  action: PlanAction;
  query: string;
  maxPrice: number | null;
  sort: PlanSort;
  limit: number | null;
}

const DEFAULT_PLAN: Plan = {
  action: 'none',
  query: '',
  maxPrice: null,
  sort: null,
  limit: null,
};

/**
 * The storefront shopping assistant. Uses Gemini in two passes so it can ground
 * answers in real shop data without relying on the model's function-calling
 * wire format:
 *
 *  1. PLAN  — Gemini decides whether it needs live data (product search / the
 *     signed-in customer's orders) and returns a small JSON action.
 *  2. ACT   — we run that action against our own services (never trusting the
 *     model with data access directly).
 *  3. ANSWER — Gemini writes the final reply, grounded in the shop context +
 *     the tool results, in the customer's language.
 */
@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  // The shop context rarely changes; cache it so we don't read settings on
  // every message.
  private contextCache: { text: string; at: number } | null = null;
  private static readonly CONTEXT_TTL_MS = 5 * 60_000;

  constructor(
    private readonly products: ProductsService,
    private readonly orders: OrdersService,
    private readonly settings: AppSettingsService,
    private readonly branches: BranchesService,
    private readonly vouchers: VouchersService,
    private readonly brands: BrandsService,
    private readonly categories: CategoriesService,
  ) {}

  async chat(
    messages: ChatMessageDto[],
    language: 'en' | 'km',
    userId?: string,
  ): Promise<ChatResult> {
    const transcript = this.flatten(messages);
    const context = await this.getStoreContext();

    // Reply in the language the customer actually wrote in (detected from their
    // last message), not merely the storefront UI language — so an English
    // question gets an English answer even when the UI is set to Khmer.
    const lastUser =
      [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const replyLang = this.detectLang(lastUser) ?? language;

    // Skip the planning call entirely for pure greetings / thanks — they never
    // need live data, so we go straight to a single answer call (halves LLM
    // usage on those messages).
    const plan = this.isSmallTalk(lastUser)
      ? { ...DEFAULT_PLAN }
      : await this.plan(transcript, Boolean(userId));

    let toolContext = '';
    let products: ChatProduct[] = [];

    if (plan.action === 'search_products') {
      products = await this.searchProducts(
        plan.query,
        plan.maxPrice,
        plan.sort,
        plan.limit,
        replyLang,
      );
      toolContext = this.describeProducts(products);
    } else if (plan.action === 'get_orders') {
      toolContext = userId
        ? await this.describeOrders(userId)
        : 'The customer is NOT signed in, so their orders cannot be looked up. Ask them to sign in to their account to check order status.';
    }

    const { reply, suggestions } = await this.answer(
      context,
      toolContext,
      transcript,
      replyLang,
    );
    return { reply, products, suggestions };
  }

  // ---- Step 1: plan -------------------------------------------------------

  private async plan(transcript: string, signedIn: boolean): Promise<Plan> {
    const prompt = [
      'You are the planning step of an online shop assistant.',
      'Read the conversation and decide if answering the LAST customer message needs live data.',
      '',
      transcript,
      '',
      'Respond with ONLY a JSON object (no markdown, no prose):',
      '{"action":"search_products"|"get_orders"|"none","query":"keywords","maxPrice":number-or-null,"sort":"cheapest"|"expensive"|"newest"|null,"limit":number-or-null}',
      '- "search_products": they ask about products, availability, price, recommendations, or the cheapest/most expensive/newest item. Put concise search keywords in "query" (leave "" if they just want e.g. the cheapest of everything).',
      '- "sort": set "cheapest" for lowest-price / most affordable requests, "expensive" for highest-price, "newest" for latest arrivals; otherwise null.',
      '- "limit": how many products to show. Set 1 when they ask for a SINGLE item (e.g. "the latest product", "a bag", "the cheapest one", "recommend me one"). Use the number they ask for if they say one (e.g. "show me 3"). Leave null for a general browse (defaults to a few).',
      `- "get_orders": they ask about their own order(s), delivery status, or purchase history.${signedIn ? '' : ' (The customer is not signed in, but still choose this if that is what they ask.)'}`,
      '- "none": greetings, policies, shipping/payment questions, or anything answerable from shop info.',
    ].join('\n');

    try {
      const raw = await this.generate(prompt, 0);
      return this.parsePlan(raw);
    } catch (err) {
      this.logger.warn(`Plan step failed, defaulting to none: ${String(err)}`);
      return { ...DEFAULT_PLAN };
    }
  }

  private parsePlan(raw: string): Plan {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { ...DEFAULT_PLAN };
    try {
      const obj = JSON.parse(match[0]) as Partial<Plan>;
      const action: PlanAction =
        obj.action === 'search_products' || obj.action === 'get_orders'
          ? obj.action
          : 'none';
      const sort: PlanSort =
        obj.sort === 'cheapest' ||
        obj.sort === 'expensive' ||
        obj.sort === 'newest'
          ? obj.sort
          : null;
      return {
        action,
        query: typeof obj.query === 'string' ? obj.query.slice(0, 120) : '',
        maxPrice:
          typeof obj.maxPrice === 'number' && obj.maxPrice > 0
            ? obj.maxPrice
            : null,
        sort,
        limit:
          typeof obj.limit === 'number' && obj.limit >= 1
            ? Math.min(Math.floor(obj.limit), 6)
            : null,
      };
    } catch {
      return { ...DEFAULT_PLAN };
    }
  }

  // ---- Step 2: tools ------------------------------------------------------

  private async searchProducts(
    query: string,
    maxPrice: number | null,
    sort: PlanSort,
    limit: number | null,
    language: 'en' | 'km',
  ): Promise<ChatProduct[]> {
    // Map the intent to the catalog's sort fields.
    const sortBy =
      sort === 'cheapest' || sort === 'expensive' ? 'price' : 'createdAt';
    const sortOrder = sort === 'cheapest' ? 'ASC' : 'DESC';

    const q = {
      search: query || undefined,
      status: 'active',
      maxPrice: maxPrice ?? undefined,
      sortBy,
      sortOrder,
      // Honour an explicit count (e.g. "the latest product" → 1); otherwise a
      // small browseable set.
      limit: limit ?? 6,
      page: 1,
    } as unknown as ProductQueryDto;

    try {
      const res = await this.products.findAll(q);
      return res.data.map((p) => {
        const primary =
          p.images?.find((i) => i.imageType === 'primary') ?? p.images?.[0];
        return {
          name: (language === 'km' ? p.nameKm : p.nameEn) || p.nameEn || p.nameKm,
          price: Number(p.price),
          slug: p.slug,
          imageUrl: primary?.imageUrl ?? null,
        };
      });
    } catch (err) {
      this.logger.warn(`Product search failed: ${String(err)}`);
      return [];
    }
  }

  private describeProducts(products: ChatProduct[]): string {
    if (products.length === 0) {
      return 'PRODUCT SEARCH RESULTS: none found matching the request.';
    }
    const lines = products.map(
      (p) => `- ${p.name} — $${p.price.toFixed(2)} (/products/${p.slug})`,
    );
    return `PRODUCT SEARCH RESULTS (already shown to the customer as cards):\n${lines.join('\n')}`;
  }

  private async describeOrders(userId: string): Promise<string> {
    try {
      const res = await this.orders.findByCustomer(userId);
      if (res.data.length === 0) {
        return 'CUSTOMER ORDERS: this customer has no orders yet.';
      }
      const lines = res.data.slice(0, 8).map((o) => {
        const total = Number(o.grandTotal).toFixed(2);
        return `- #${o.orderNumber}: status "${o.status}", payment "${o.paymentStatus}", total ${o.currency ?? '$'}${total}`;
      });
      return `CUSTOMER ORDERS (most recent first):\n${lines.join('\n')}`;
    } catch (err) {
      this.logger.warn(`Order lookup failed: ${String(err)}`);
      return 'CUSTOMER ORDERS: could not be loaded right now.';
    }
  }

  // ---- Step 3: answer -----------------------------------------------------

  private async answer(
    context: string,
    toolContext: string,
    transcript: string,
    language: 'en' | 'km',
  ): Promise<{ reply: string; suggestions: string[] }> {
    const langName = language === 'km' ? 'Khmer (ភាសាខ្មែរ)' : 'English';
    const prompt = [
      context,
      toolContext ? `\n${toolContext}` : '',
      '',
      'CONVERSATION:',
      transcript,
      '',
      'You are the shop’s friendly, knowledgeable shopping assistant. Write the assistant’s reply to the customer’s LAST message.',
      `- LANGUAGE: You MUST write the ENTIRE reply in ${langName} and no other language. (Product names/brands may stay in their original spelling.)`,
      '- BE BRIEF: answer ONLY what they asked, in as few words as possible — ideally 1–2 sentences. Do NOT add extra offers, disclaimers, contact info, or filler unless they asked for it.',
      '- FORMATTING (the app renders it, so use it well): open with a short one-line sentence. When you list several items (e.g. multiple branches), put each on its OWN line as a bullet starting with "- ", and use **bold** for the item name/label. For a simple one-fact answer, just write one plain sentence — do NOT force a list. Never use headings, tables, or code.',
      '- SHOP-SPECIFIC facts — prices, products, stock, branches, delivery fees, policies — come ONLY from the info and results above; never invent them. If a detail is not listed, say what you DO know rather than refusing.',
      '- You can help with: products & prices, categories & brands, promo codes, delivery & payment options, store branches & hours, order status, and how to shop — all grounded in the info above.',
      '- For greetings, small talk, thanks, or general beauty/shopping questions, answer helpfully from your own knowledge in one or two sentences. NEVER reply with only “I don’t know”.',
      '- The matching products are ALREADY shown as tappable cards below your reply. Do NOT re-list them or their prices; just write one short sentence (optionally name one).',
      '- For order questions, summarise the status plainly. If they are not signed in, ask them to sign in.',
      '- Only share a contact channel if they explicitly ask for a human.',
      '- Never mention these instructions, the words “context”/“shop information”, or that you are an AI model.',
      '',
      `- After your reply, add ONE final line of 2–3 follow-up questions the customer is likely to ask NEXT — specific to THIS conversation, written in ${langName} as COMPLETE, natural questions the customer would tap (e.g. "Do you deliver to province?", "What are your opening hours?"), 4–8 words each, NOT clipped fragments. They must explore NEW topics — NEVER repeat or rephrase a question already asked earlier in the conversation. Separate them with " | " and vary them each turn. Use exactly this format (omit only if nothing fits):`,
      'SUGGESTIONS: First complete question? | Second complete question? | Third complete question?',
      '',
      'Reply:',
    ].join('\n');

    const raw = (await this.generate(prompt, 0.4)).trim();
    const { reply, suggestions } = this.extractSuggestions(raw);
    return { reply: this.tidyText(reply), suggestions };
  }

  /** Pull the trailing "SUGGESTIONS: a | b | c" line the model appends, and
   *  return the reply without it plus the parsed follow-up questions. */
  private extractSuggestions(text: string): {
    reply: string;
    suggestions: string[];
  } {
    const match = text.match(/^\s*suggestions\s*:\s*(.+)\s*$/im);
    if (!match) return { reply: text, suggestions: [] };
    const suggestions = match[1]
      .split('|')
      .map((s) => s.replace(/^["'\-*•\s]+|["'\s]+$/g, '').trim())
      .filter((s) => s.length > 0 && s.length <= 60)
      .slice(0, 3);
    const reply = text.replace(match[0], '').trim();
    return { reply, suggestions };
  }

  /** Small-talk detector: the message is essentially just a greeting or thanks,
   *  so it never needs a product/order lookup. */
  private isSmallTalk(text: string): boolean {
    const t = text.trim();
    if (!t) return true;
    if (t.length > 24) return false; // anything longer: let the planner decide
    return /^(hi+|hello+|hey+|yo|thanks?|thank you|thx|ok(ay)?|bye+|good (morning|afternoon|evening)|សួស្តី|ជម្រាបសួរ|អរគុណ|បាទ|ចាស|ចា៎|លាហើយ)[!.…\s]*$/i.test(
      t,
    );
  }

  /** The bubble renders a light Markdown subset (bold + bullets + line breaks),
   *  so KEEP those but strip anything it doesn't render (headings, tables, code,
   *  stray underscores) and tidy whitespace — so nothing shows as raw symbols. */
  private tidyText(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, '') // fenced code blocks
      .replace(/`([^`]*)`/g, '$1') // inline code
      .replace(/^\s{0,3}#{1,6}\s+/gm, '') // headings → plain line
      .replace(/^\s*\|.*\|\s*$/gm, '') // table rows
      .replace(/__([^_]+)__/g, '$1') // underscore-bold → plain
      .replace(/^\s*[*+]\s+/gm, '- ') // normalise bullet markers to "- "
      .replace(/\n{3,}/g, '\n\n') // collapse excess blank lines
      .trim();
  }

  // ---- Store context ------------------------------------------------------

  private async getStoreContext(): Promise<string> {
    const now = Date.now();
    if (
      this.contextCache &&
      now - this.contextCache.at < AiChatService.CONTEXT_TTL_MS
    ) {
      return this.contextCache.text;
    }
    const text = await this.buildStoreContext();
    this.contextCache = { text, at: now };
    return text;
  }

  private async buildStoreContext(): Promise<string> {
    let cfg: Record<string, unknown> = {};
    try {
      const setting = await this.settings.findByGroupAndKey(
        'storefront',
        'home_config',
      );
      cfg = JSON.parse(setting.settingValue) as Record<string, unknown>;
    } catch {
      // No config yet — fall back to a minimal generic context.
    }

    const s = (k: string): string =>
      typeof cfg[k] === 'string' ? (cfg[k] as string) : '';
    const brand = s('brandNameEn') || 'our shop';
    const lines: string[] = [
      `SHOP INFORMATION for "${brand}" ${s('brandNameKm') ? `(Khmer: ${s('brandNameKm')})` : ''}`.trim(),
    ];
    if (s('taglineEn') || s('taglineKm')) {
      lines.push(`Tagline: ${s('taglineEn') || s('taglineKm')}`);
    }
    if (s('aboutStoryEn')) {
      lines.push(`About: ${s('aboutStoryEn').slice(0, 500)}`);
    }
    if (s('footerDescriptionEn')) {
      lines.push(`In short: ${s('footerDescriptionEn')}`);
    }
    const phone = s('contactPhone');
    const email = s('contactEmail');
    if (phone) lines.push(`Phone: ${phone}`);
    if (email) lines.push(`Email: ${email}`);
    const highlights = cfg.aboutHighlights as
      | Array<{ titleEn?: string; titleKm?: string }>
      | undefined;
    if (Array.isArray(highlights) && highlights.length) {
      const titles = highlights
        .map((h) => h.titleEn || h.titleKm)
        .filter(Boolean);
      if (titles.length) lines.push(`Why shop with us: ${titles.join('; ')}.`);
    }
    const address = s('contactAddressEn') || s('contactAddressKm');
    if (address) lines.push(`Main contact address: ${address}`);

    // Branches / store locations — grounds "how many branches / where are you"
    // questions in real data instead of the model guessing from one address.
    try {
      const { data: branchList, total } = await this.branches.findActive();
      if (total > 0) {
        lines.push(
          `Store branches: ${total} active ${total === 1 ? 'branch' : 'branches'}.`,
          ...branchList.slice(0, 15).map((b) => {
            const name = b.branchNameEn || b.branchNameKm || b.branchCode;
            const where = [b.streetAddress, b.city].filter(Boolean).join(', ');
            const hours =
              typeof b.openingHours === 'string' ? b.openingHours : '';
            const parts = [
              where && `address: ${where}`,
              b.phoneNumber && `phone: ${b.phoneNumber}`,
              hours && `hours: ${hours}`,
            ].filter(Boolean);
            return `- ${name}${parts.length ? ` (${parts.join('; ')})` : ''}`;
          }),
        );
      }
    } catch {
      // Branch lookup failed — leave it out rather than block the answer.
    }

    // Catalog overview — categories, brands and how many products, so the
    // assistant can answer "what do you sell / what brands / how many products".
    try {
      const cats = await this.categories.findAll(1, 50);
      const names = cats.data
        .map((c) => c.nameEn || c.nameKm)
        .filter(Boolean);
      if (names.length)
        lines.push(`Product categories: ${names.join(', ')}.`);
    } catch {
      /* ignore */
    }
    try {
      const brandRes = await this.brands.findActive();
      const names = brandRes.data.map((b) => b.name).filter(Boolean);
      if (names.length) lines.push(`Brands we carry: ${names.join(', ')}.`);
    } catch {
      /* ignore */
    }
    try {
      const prod = await this.products.findAll({
        status: 'active',
        limit: 1,
        page: 1,
      } as unknown as ProductQueryDto);
      if (prod.total)
        lines.push(
          `We currently have ${prod.total} products in the shop. When a customer asks about specific items, categories, price, the cheapest, or the newest, I fetch and show them as cards.`,
        );
    } catch {
      /* ignore */
    }

    // Delivery & payment
    const delivery = cfg.delivery as
      | {
          fee?: number;
          freeOver?: number;
          regions?: Array<{ id?: string; nameEn?: string; nameKm?: string }>;
          methods?: Array<{
            id?: string;
            nameEn?: string;
            nameKm?: string;
            enabled?: boolean;
            fee?: number;
            payment?: string;
            regionId?: string;
          }>;
        }
      | undefined;
    if (delivery?.methods?.length) {
      const active = delivery.methods.filter((m) => m.enabled);
      if (active.length) {
        // Human labels — never expose the internal method id/key to customers.
        const KNOWN_LABELS: Record<string, string> = {
          cod: 'Cash on Delivery',
          grab: 'Grab Delivery',
          pickup: 'Pick Up at Store',
          vet_express: 'VET Express',
        };
        const regionName = (id?: string): string => {
          const fromCfg = delivery.regions?.find((r) => r.id === id);
          if (fromCfg?.nameEn) return fromCfg.nameEn;
          if (id === 'phnom_penh') return 'Phnom Penh';
          if (id === 'province') return 'Province';
          return 'any area';
        };
        const payText = (p?: string): string =>
          p === 'prepay'
            ? 'pay first via KHQR'
            : p === 'on_pickup'
              ? 'pay on delivery/pickup'
              : p === 'either'
                ? 'pay now or on delivery'
                : 'see checkout';
        lines.push(
          'Delivery options (always refer to them by these names, never an id):',
          ...active.map((m) => {
            const en =
              m.nameEn ||
              (m.id ? KNOWN_LABELS[m.id] : '') ||
              m.id ||
              'Delivery';
            const label =
              m.nameKm && m.nameKm !== en ? `${en} (${m.nameKm})` : en;
            return `- ${label} — area: ${regionName(m.regionId)}, fee $${Number(m.fee ?? 0).toFixed(2)}, ${payText(m.payment)}`;
          }),
        );
      }
      if (typeof delivery.freeOver === 'number' && delivery.freeOver > 0) {
        lines.push(`Free delivery on orders over $${delivery.freeOver}.`);
      }
    }

    // Contacts & socials — used for human handoff.
    const contacts = cfg.contacts as
      | Array<{ label?: string; value?: string }>
      | undefined;
    if (Array.isArray(contacts) && contacts.length) {
      lines.push(
        'Contact channels (for reaching a human):',
        ...contacts
          .filter((c) => c.value)
          .map((c) => `- ${c.label ?? 'Contact'}: ${c.value}`),
      );
    }
    const socials = cfg.socials as
      | Array<{ name?: string; url?: string }>
      | undefined;
    if (Array.isArray(socials) && socials.length) {
      lines.push(
        ...socials
          .filter((soc) => soc.url)
          .map((soc) => `- ${soc.name ?? 'Social'}: ${soc.url}`),
      );
    }

    // Active promo / voucher codes — so the assistant can answer "any promo
    // codes?" instead of claiming there are none.
    try {
      const promos = await this.vouchers.findActivePublic();
      if (promos.length) {
        lines.push(
          'Active promo codes (customer enters the CODE at checkout):',
          ...promos.slice(0, 12).map((p) => {
            const off =
              p.discountType === 'percent'
                ? `${Number(p.discountValue)}% off`
                : `$${Number(p.discountValue).toFixed(2)} off`;
            const extra = [
              Number(p.minSpend) > 0
                ? `min spend $${Number(p.minSpend).toFixed(2)}`
                : '',
              p.maxDiscount ? `up to $${Number(p.maxDiscount).toFixed(2)}` : '',
              p.endAt
                ? `valid until ${new Date(p.endAt).toISOString().slice(0, 10)}`
                : '',
            ].filter(Boolean);
            const name = p.nameEn || p.nameKm || '';
            const codeLabel = p.code ? `code "${p.code}"` : 'auto-applied';
            return `- ${codeLabel}: ${off}${name ? ` — ${name}` : ''}${extra.length ? ` (${extra.join(', ')})` : ''}`;
          }),
        );
      }
    } catch {
      // Promos are optional context — ignore lookup failures.
    }

    lines.push(
      'Payment: ABA KHQR (scan to pay) and cash where offered. Uploaded proof is confirmed by staff.',
    );
    return lines.join('\n');
  }

  // ---- Utilities ----------------------------------------------------------

  /** Detect the language of the customer's message from its script: any Khmer
   *  characters → Khmer; otherwise Latin letters → English; else unknown. */
  private detectLang(text: string): 'en' | 'km' | null {
    // Khmer Unicode block U+1780–U+17FF.
    if (/[ក-៿]/.test(text)) return 'km';
    if (/[A-Za-z]/.test(text)) return 'en';
    return null;
  }

  /** Flatten the recent transcript into a compact, labelled text block. */
  private flatten(messages: ChatMessageDto[]): string {
    return messages
      .slice(-10)
      .map(
        (m) =>
          `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content.trim()}`,
      )
      .join('\n');
  }

  /**
   * Generate text with automatic provider fallback: try Gemini first, and if
   * its free quota is exhausted (or it errors), fall back to Groq — so the
   * assistant keeps working instead of dying on a rate-limit.
   */
  private async generate(prompt: string, temperature: number): Promise<string> {
    const hasGemini = Boolean(process.env.GOOGLE_API_KEY);
    const hasGroq = Boolean(process.env.GROQ_API_KEY);
    if (!hasGemini && !hasGroq) {
      throw new InternalServerErrorException(
        'No AI provider configured. Set GOOGLE_API_KEY and/or GROQ_API_KEY.',
      );
    }

    let lastError: Error | null = null;
    if (hasGemini) {
      try {
        return await this.callGemini(prompt, temperature);
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(
          `Gemini unavailable, falling back to Groq: ${lastError.message}`,
        );
      }
    }
    if (hasGroq) {
      try {
        return await this.callGroq(prompt, temperature);
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(`Groq failed: ${lastError.message}`);
      }
    }
    throw new ServiceUnavailableException(
      lastError?.message ?? 'AI service is currently unavailable.',
    );
  }

  private async callGemini(prompt: string, temperature: number): Promise<string> {
    const apiKey = process.env.GOOGLE_API_KEY as string;

    let lastError: Error | null = null;
    for (const model of GEMINI_MODELS) {
      try {
        const res = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: 800,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        });
        const data = (await res.json()) as GeminiResponse;
        if (!res.ok) {
          // On a quota / rate-limit (429) every Gemini free model shares the
          // same cap, so don't hammer the others — bail out to the fallback.
          if (res.status === 429) {
            throw new Error(data.error?.message ?? 'Gemini quota exceeded');
          }
          throw new Error(
            data.error?.message ?? `AI service returned ${res.status}`,
          );
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty response from Gemini');
        return text;
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(`Gemini model "${model}" failed: ${lastError.message}`);
        if (lastError.message.toLowerCase().includes('quota')) break;
      }
    }
    throw lastError ?? new Error('Gemini unavailable');
  }

  /** Groq (OpenAI-compatible) fallback. */
  private async callGroq(prompt: string, temperature: number): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY as string;

    let lastError: Error | null = null;
    for (const model of GROQ_MODELS) {
      try {
        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: 800,
          }),
        });
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          error?: { message?: string };
        };
        if (!res.ok) {
          throw new Error(
            data.error?.message ?? `Groq returned ${res.status}`,
          );
        }
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty response from Groq');
        return text;
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(`Groq model "${model}" failed: ${lastError.message}`);
      }
    }
    throw lastError ?? new Error('Groq unavailable');
  }
}
