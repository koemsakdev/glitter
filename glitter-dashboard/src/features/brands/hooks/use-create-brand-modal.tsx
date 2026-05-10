import { parseAsBoolean, useQueryState } from "nuqs";

export const useCreateBrandModal = () => {
    const [isOpen, setIsOpen] = useQueryState(
        "create-brand",
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