declare module 'react-world-flags' {
    import type { CSSProperties, ReactNode, ComponentType } from 'react';

    interface FlagProps {
        code?: string;
        height?: string | number;
        width?: string | number;
        fallback?: ReactNode;
        className?: string;
        style?: CSSProperties;
        alt?: string;
    }

    const Flag: ComponentType<FlagProps>;
    export default Flag;
}
