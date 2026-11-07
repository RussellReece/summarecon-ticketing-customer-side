// src/components/ui/StatusBadge.tsx
import React from "react";
import { getStatusMeta } from "@/lib/status-mapper";

interface StatusBadgeProps {
  status: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
  customLabel?: string;
}

export function StatusBadge({
  status,
  size = "md",
  className = "",
  customLabel,
}: StatusBadgeProps) {
  const meta = getStatusMeta(status);

  const sizeClasses = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2 font-medium",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${meta.bgClass} ${meta.textClass} ${meta.borderClass} ${sizeClasses[size]} ${className}`}
    >
      <span className="font-semibold text-[0.9em] leading-none select-none" aria-hidden="true">
        {meta.symbol}
      </span>
      <span>{customLabel ?? meta.label}</span>
    </span>
  );
}

