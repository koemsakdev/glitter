import { Star } from 'lucide-react';

/** Five-star rating display. `value` is rounded to the nearest whole star;
 *  `size` is the icon edge length in pixels. */
export function StarRating({ value, size = 14 }: { value: number; size?: number }) {
    const rounded = Math.round(value);
    return (
        <span className="inline-flex">
            {Array.from({ length: 5 }, (_, i) => (
                <Star
                    key={i}
                    style={{ width: size, height: size }}
                    className={
                        i < rounded
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700'
                    }
                />
            ))}
        </span>
    );
}
