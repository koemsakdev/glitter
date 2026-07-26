import type { Lang } from './locale';

/** A product surfaced by the assistant, rendered as a card in the chat. */
export interface ChatProduct {
    name: string;
    price: number;
    slug: string;
    imageUrl: string | null;
}

/** The API's reply payload. */
export interface ChatReply {
    reply: string;
    products: ChatProduct[];
    /** AI-generated follow-up questions relevant to this conversation. */
    suggestions?: string[];
}

/** A message in the on-screen transcript (assistant messages may carry cards). */
export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    products?: ChatProduct[];
    suggestions?: string[];
}

export type ChatError = 'rate' | 'error';

type AuthFetch = (path: string, init?: RequestInit) => Promise<Response>;

/**
 * Send the transcript to the assistant. Uses `authFetch` so a signed-in
 * customer's token rides along (enabling order lookup); guests work too.
 */
export async function sendChat(
    authFetch: AuthFetch,
    messages: { role: 'user' | 'model'; content: string }[],
    language: Lang,
): Promise<ChatReply> {
    const res = await authFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages, language }),
    });
    if (!res.ok) {
        const err: ChatError = res.status === 429 ? 'rate' : 'error';
        throw new Error(err);
    }
    return (await res.json()) as ChatReply;
}
