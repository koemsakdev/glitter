// import {useI18n} from "@/lib/i18n";
// import {Badge} from "@/components/ui/badge";
// import {cn} from "@/lib/utils";
//
// interface StatusBadgeProps {
//     status: string | 'active' | 'inactive';
//     className?: string;
//     classNameText?: string;
//     inActiveClassName?: string;
//     inActiveClassNameText?: string;
// }
//
// export function StatusBadge({ status, className, classNameText, inActiveClassName, inActiveClassNameText }: StatusBadgeProps) {
//     const {t} = useI18n();
//
//     if (status.toLocaleLowerCase() === 'active') {
//         return (
//             <Badge
//                 className={cn(
//                     "bg-pink-100 text-pink-700 hover:bg-pink-100 dark:bg-pink-500/15 dark:text-pink-300 dark:hover:bg-pink-500/15",
//                     className
//                 )}>
//                 {t('brand.status.active')}
//             </Badge>
//         );
//     }
//
//     return (
//         <Badge
//             variant="secondary"
//             className={cn(
//                 "text-muted-foreground",
//                 inActiveClassName
//             )}
//         >
//             <span className={cn(
//                 "mr-1 inline-block size-1.5 rounded-full bg-muted-foreground",
//                 inActiveClassNameText
//             )}/>
//             {t('brand.status.inactive')}
//         </Badge>
//     );
// }


import {useI18n} from "@/lib/i18n";
import {Badge} from "@/components/ui/badge";
import {cn} from "@/lib/utils";
import React from "react";

interface StatusBadgeProps {
    status: string | 'active' | 'inactive';
    className?: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';
    children?: React.ReactNode;
    childrenClassName?: string;
}

export function StatusBadge({ status, className, variant, children, childrenClassName }: StatusBadgeProps) {
    const {t} = useI18n();

    return (
        <Badge
            variant={variant}
            className={cn(
                "bg-pink-100 text-pink-700 hover:bg-pink-100 dark:bg-pink-500/15 dark:text-pink-300 dark:hover:bg-pink-500/15",
                className
            )}>
            {children && <span className={cn("mr-1", childrenClassName)}>{children}</span>}
            {status === 'active'
                  ? t('brand.status.active')
                  : status === 'inactive'
                      ? t('brand.status.inactive')
                      : status}
        </Badge>
    );
}