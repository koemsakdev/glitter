/**
 * Generates a variant SKU based on the product SKU + size + color.
 * Example: "GUC-BAG-001" + "Small" + "Black" → "GUC-BAG-001-SM-BLK"
 *
 * Logic:
 *  - Size: first 2 chars (uppercased)
 *  - Color: first 3 chars (uppercased), strip non-alpha
 *  - If size or color is empty, that segment is skipped
 */
export function generateVariantSku(
    productSku: string, size: string, color: string, p0: string,
): string {
    if (!productSku.trim()) return '';

    const parts: string[] = [productSku.trim().toUpperCase()];

    if (size.trim()) {
        const sizePart = size
            .trim()
            .replace(/[^a-z0-9]/gi, '')
            .slice(0, 2)
            .toUpperCase();
        if (sizePart) parts.push(sizePart);
    }

    if (color.trim()) {
        const colorPart = color
            .trim()
            .replace(/[^a-z0-9]/gi, '')
            .slice(0, 3)
            .toUpperCase();
        if (colorPart) parts.push(colorPart);
    }

    return parts.join('-');
}