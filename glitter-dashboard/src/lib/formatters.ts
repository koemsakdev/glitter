/**
 * Format a price as a currency string.
 * Returns "$1,890.00" or "$0.00" if invalid.
 */
export function formatPrice(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '$0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
}

/**
 * Format a stock number — adds visual emphasis to zero/low stock.
 */
export function formatStock(value: number | null | undefined): string {
    if (value === null || value === undefined) return '0';
    return value.toLocaleString('en-US');
}

/**
 * Generate a URL-safe slug from a name.
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}