import { useMedia } from "react-use";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";

import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerTitle
} from "@/components/ui/drawer";
import React, { useRef } from "react";

interface ResponsiveModalProps {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ResponsiveModal = ({
    children,
    open,
    onOpenChange,
}: ResponsiveModalProps) => {
    const isDesktop = useMedia("(min-width: 1027px)", true);
    const dialogContentRef = useRef<HTMLDivElement>(null);

    if (isDesktop) {
        return (
            <Dialog
                open={open}
                onOpenChange={onOpenChange}
            >
                <DialogTitle />
                <DialogDescription />
                <DialogContent ref={dialogContentRef} className="w-full sm:max-w-lg p-0 border-none overflow-y-auto hide-scrollbar max-h-[85vh]">
                    {children}
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer
            open={open}
            onOpenChange={onOpenChange}
        >
            <DrawerContent ref={dialogContentRef}>
                <DrawerTitle />
                <DrawerDescription />
                <div className="overflow-y-auto hide-scrollbar max-h-[85vh]">
                    {children}
                </div>
            </DrawerContent>
        </Drawer>
    )
}