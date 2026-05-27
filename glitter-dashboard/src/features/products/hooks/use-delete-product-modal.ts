import { parseAsBoolean, useQueryState } from 'nuqs';

export const useDeleteProductModal = () => {
    const [isOpen, setIsOpen] = useQueryState(
        'delete-product',
        parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true }),
    );

    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);

    return { isOpen, open, close, setIsOpen };
};