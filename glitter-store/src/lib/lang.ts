import { cookies } from 'next/headers';
import type { Lang } from './locale';

/** Reads the visitor's language from the `lang` cookie (defaults to English). */
export async function getLang(): Promise<Lang> {
    const store = await cookies();
    return store.get('lang')?.value === 'km' ? 'km' : 'en';
}
