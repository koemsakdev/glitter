const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export function getFileUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}