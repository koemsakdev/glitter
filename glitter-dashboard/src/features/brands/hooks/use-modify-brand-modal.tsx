import { parseAsBoolean, useQueryState } from "nuqs";

export const useModifyBrandModal = () => {
    const [isOpen, setIsOpen] = useQueryState(
        "modify-brand",
        parseAsBoolean.withDefault(false).withOptions({clearOnDefault: true})
    )

    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);

    return {
        isOpen,
        open,
        close,
        setIsOpen
    }
}