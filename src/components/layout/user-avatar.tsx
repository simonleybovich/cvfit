"use client";

import { useState } from "react";

interface UserAvatarProps {
  avatarUrl?: string;
  displayName: string;
}

/** Falls back to initials when the external avatar URL fails to load (blocked by an
 * extension, revoked, rate-limited, etc.) instead of showing a broken-image icon. */
export function UserAvatar({ avatarUrl, displayName }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (!avatarUrl || failed) {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[0.6rem] font-medium text-primary-foreground">
        {initials(displayName)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external OAuth avatar, not worth next/image config for a header icon
    <img
      src={avatarUrl}
      alt=""
      className="size-5 rounded-full"
      onError={() => setFailed(true)}
    />
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
