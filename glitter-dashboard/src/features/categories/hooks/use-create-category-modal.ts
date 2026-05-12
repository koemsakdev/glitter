import { parseAsBoolean, useQueryState } from 'nuqs';

export const useCreateCategoryModal = () => {
    const [isOpen, setIsOpen] = useQueryState(
        'create-category',
        parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true }),
    );

    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);

    return { isOpen, open, close, setIsOpen };
};