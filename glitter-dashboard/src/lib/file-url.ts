const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export function getFileUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    // Encode each path segment so filenames with spaces or characters like
    // "#" / "(" don't break the URL (keeps the "/" separators intact).
    const encoded = path.split('/').map(encodeURIComponent).join('/');
    return `${API_URL}${encoded.startsWith('/') ? '' : '/'}${encoded}`;
}
