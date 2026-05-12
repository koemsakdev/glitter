import { parseAsBoolean, useQueryState } from 'nuqs';

export const useDeleteCategoryModal = () => {
    const [isOpen, setIsOpen] = useQueryState(
        'delete-category',
        parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true }),
    );

    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);

    return { isOpen, open, close, setIsOpen };
};