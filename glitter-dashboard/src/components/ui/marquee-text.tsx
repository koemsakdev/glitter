'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Shows text in full; if it overflows its box, scrolls it continuously in one
 * direction (like the old <marquee> tag). Two copies + translateX(-50%) loop
 * seamlessly with no jump. Only animates when the text actually overflows.
 */
export function MarqueeText({
    text,
    className = '',
}: {
    text: string;
    className?: string;
}) {
    const boxRef = useRef<HTMLSpanElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [overflow, setOverflow] = useState(false);
    const [duration, setDuration] = useState(8);

    useEffect(() => {
        const box = boxRef.current;
        const txt = textRef.current;
        if (!box || !txt) return;
        const textWidth = txt.getBoundingClientRect().width;
        setOverflow(textWidth > box.clientWidth + 1);
        // ~20px per second (slow, easy to read); consistent regardless of length.
        setDuration(Math.max(7, (textWidth + 32) / 20));
    }, [text]);

    return (
        <span
            ref={boxRef}
            title={text}
            className={`block w-full overflow-hidden whitespace-nowrap ${className}`}
        >
            <span
                className={
                    overflow ? 'marquee-track inline-flex' : 'inline-block'
                }
                style={
                    overflow
                        ? ({
                              animation: `marquee-loop ${duration}s linear infinite`,
                          } as CSSProperties)
                        : undefined
                }
            >
                <span ref={textRef} className={overflow ? 'pr-8' : undefined}>
                    {text}
                </span>
                {overflow && (
                    <span className="pr-8" aria-hidden>
                        {text}
                    </span>
                )}
            </span>
        </span>
    );
}
