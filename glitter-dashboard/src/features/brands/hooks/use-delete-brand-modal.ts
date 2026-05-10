import { parseAsBoolean, useQueryState } from 'nuqs';

export const useDeleteBrandModal = () => {
    const [isOpen, setIsOpen] = useQueryState(
        'delete-brand',
        parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true }),
    );

    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);

    return {
        isOpen,
        open,
        close,
        setIsOpen,
    };
};