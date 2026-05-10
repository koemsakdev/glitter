'use client';

interface AnimatedMenuIconProps {
    isOpen: boolean;
    className?: string;
}

export function AnimatedMenuIcon({
                                     isOpen,
                                     className = '',
                                 }: AnimatedMenuIconProps) {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
        >
            {/* Top bar — open: long left-aligned, closed: short right-aligned */}
            <rect
                x={isOpen ? 3 : 13}
                y="5"
                width={isOpen ? 14 : 8}
                height="2.5"
                rx="1.25"
                style={{
                    transition: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            />

            {/* Middle bar — same length both states, slight horizontal shift */}
            <rect
                x={isOpen ? 3 : 7}
                y="10.75"
                width="14"
                height="2.5"
                rx="1.25"
                style={{
                    transition: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1) 50ms',
                }}
            />

            {/* Bottom bar — open: short left-aligned, closed: long right-aligned */}
            <rect
                x={isOpen ? 3 : 7}
                y="16.5"
                width={isOpen ? 8 : 14}
                height="2.5"
                rx="1.25"
                style={{
                    transition: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1) 100ms',
                }}
            />

            {/* Accent dot — moves between the short bar's end position */}
            <circle
                cx={isOpen ? 19.5 : 4.5}
                cy={isOpen ? 6.25 : 17.75}
                r="1.25"
                style={{
                    transition: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1) 150ms',
                }}
            />
        </svg>
    );
}