"use client";

import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader } from "lucide-react";

type ToastVariant = "default" | "destructive" | "success" | "info" | "warning";

interface AppToastOptions {
    variant?: ToastVariant;
    title: string;
    description?: string;
    duration?: number;
}

export function useToast() {
const showToast = ({
   variant = "default",
   title,
   description,
   duration = 4000,
}: AppToastOptions) => {

        switch (variant) {
            case "destructive":
                // Notice we changed (t) to () since it's unused
                return toast.custom(() => (
                    <div className="flex items-center gap-4 bg-[#FFD5D5] dark:bg-[#2C1A1A] p-5 rounded-[22px] shadow-lg min-w-[350px] border border-transparent dark:border-[#522525] animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="shrink-0 bg-white dark:bg-[#1A0B0B] rounded-full shadow-sm">
                            <XCircle className="w-12 h-12 text-[#E54D4D] dark:text-[#2C1A1A] stroke-[2px]" />
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <h3 className="text-[17px] font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                {title}
                            </h3>
                            {description && (
                                <p className="text-[15px] text-slate-600 dark:text-slate-400 font-medium">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                ), { duration });

            case "success":
                return toast.custom(() => (
                    <div className="flex items-center gap-4 bg-[#DCFCE7]/25 dark:bg-[#132A1C]/25 p-5 rounded-[22px] shadow-lg min-w-87.5 border border-transparent dark:border-[#1B3D27] backdrop-blur-lg">
                        <div className="shrink-0 bg-white dark:bg-[#0A140E] rounded-full shadow-sm">
                            <CheckCircle2 className="w-12 h-12 text-[#10B981] dark:text-[#132A1C] stroke-[2px]" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <h3 className="text-[17px] font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                {title}
                            </h3>
                            {description && (
                                <p className="text-[15px] text-slate-600 dark:text-slate-400 font-medium">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                ), { duration });

            default:
                return toast(title, { description, duration });
        }
    };

    const loading = (title: string, description?: string) => {
        return toast.custom(
            () => (
                <div className="flex items-center gap-4 bg-[#EFF6FF] dark:bg-[#0F172A] p-5 rounded-[22px] shadow-lg min-w-[350px] border border-transparent dark:border-[#1E293B]">
                    <div className="shrink-0 bg-white dark:bg-[#0A0F1A] rounded-full shadow-sm">
                        <Loader className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-spin" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <h3 className="text-[17px] font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-[15px] text-slate-600 dark:text-slate-400 font-medium">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
            ),
            { duration: Infinity }
        );
    };

    const apiError = (err: any) => {
        const message = err?.response?.data?.message || err?.message || "Something went wrong";
        showToast({
            variant: "destructive",
            title: "Error",
            description: message,
        });
    };

    return {
        toast: showToast,
        loading,
        apiError,
        dismiss: (id?: string | number) => toast.dismiss(id),
    };
}