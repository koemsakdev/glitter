import { parseAsBoolean, useQueryState } from 'nuqs';

export const useModifyCategoryModal = () => {
    const [isOpen, setIsOpen] = useQueryState(
        'modify-category',
        parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true }),
    );

    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);

    return { isOpen, open, close, setIsOpen };
};