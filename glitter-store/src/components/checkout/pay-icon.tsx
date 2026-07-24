"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";

/** Payment-method icon: the uploaded logo, falling back to a default icon if
 *  the image is missing or fails to load. */
export function PayIcon({
  iconUrl,
  Icon,
}: {
  iconUrl: string | null;
  Icon: LucideIcon;
}) {
  const [failed, setFailed] = useState(false);
  if (iconUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        className="size-full object-contain rounded-lg"
        onError={() => setFailed(true)}
      />
    );
  }
  return <Icon className="size-6" />;
}
