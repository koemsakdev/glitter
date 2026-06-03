'use client';

import type { LucideIcon } from 'lucide-react';

interface ComingSoonCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
}

export function ComingSoonCard({
   icon: Icon,
   title,
   description,
}: ComingSoonCardProps) {
    return (
        <div className="rounded-xl border border-dashed bg-muted/20">
            <div className="border-b border-dashed px-5 py-4">
                <h2 className="flex items-center gap-2 text-base font-semibold text-muted-foreground">
                    <Icon className="size-4" />
                    {title}
                </h2>
            </div>
            <div className="flex items-center justify-center px-5 py-10">
                <p className="text-sm italic text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}