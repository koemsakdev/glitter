import type { Area } from 'react-easy-crop';

/**
 * Cut `area` (in source-image pixels) out of an image and return it as a new
 * File, scaled down to at most `maxSize` px on its longest side. The area may
 * reach past the image's edges (zoomed out to keep the whole picture) — that
 * part stays transparent.
 */
export async function cropToFile(
    src: string,
    area: Area,
    {
        name,
        type = 'image/webp',
        maxSize = 1024,
        quality = 0.92,
    }: { name: string; type?: string; maxSize?: number; quality?: number },
): Promise<File> {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = src;
    });
    const scale = Math.min(1, maxSize / Math.max(area.width, area.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(area.width * scale));
    canvas.height = Math.max(1, Math.round(area.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.imageSmoothingQuality = 'high';

    // Only the part of the area that overlaps the image is drawn (some
    // browsers mis-scale when the source rectangle leaves the image).
    const sx = Math.max(0, area.x);
    const sy = Math.max(0, area.y);
    const ex = Math.min(img.naturalWidth, area.x + area.width);
    const ey = Math.min(img.naturalHeight, area.y + area.height);
    if (ex > sx && ey > sy) {
        ctx.drawImage(
            img,
            sx,
            sy,
            ex - sx,
            ey - sy,
            (sx - area.x) * scale,
            (sy - area.y) * scale,
            (ex - sx) * scale,
            (ey - sy) * scale,
        );
    }

    const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Crop failed'))),
            type,
            quality,
        ),
    );
    const ext =
        type === 'image/png' ? 'png' : type === 'image/jpeg' ? 'jpg' : 'webp';
    return new File([blob], `${name.replace(/\.[^.]+$/, '')}.${ext}`, {
        type,
    });
}
