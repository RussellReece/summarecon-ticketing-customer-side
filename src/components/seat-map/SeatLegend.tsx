// src/components/seat-map/SeatLegend.tsx
//
// Accessible Legend displaying seat statuses per Style Guide:
// Uses uniform mini-seat components for consistency.
// - Tersedia: Tint #E3F4F1, border 2px #1F8F7E, text #14665A
// - Pilihanmu: Solid #D93A2F, white text, "✓"
// - Ditahan: Solid #E9A12B, Plum Ink text, "⋯"
// - Terjual: Solid #6B5A6E, white text, "✕"
// - Terblokir: Diagonal hatch #E6DFE3, border #9A8F95, "⊘"
//
// Layout (mobile-first): satu container `flex flex-wrap justify-center` dengan item
// berlebar alami (bukan grid kolom tetap), sehingga label panjang seperti
// "VIP / Premium" tidak pernah meluap dari badge-nya pada viewport 360px.

"use client";

import React from "react";

interface SeatLegendProps {
  compact?: boolean;
  className?: string;
}

interface LegendItem {
  key: string;
  label: string;
  glyph: string;
  swatchClassName: string;
  labelClassName: string;
  swatchStyle?: React.CSSProperties;
}

const LEGEND_ITEMS: LegendItem[] = [
  {
    key: "vip",
    label: "VIP / Premium",
    glyph: "01",
    swatchClassName: "border-[#D9822B] bg-[#FFF8E7] text-[#8F4800]",
    labelClassName: "font-semibold text-[#8F4800]",
  },
  {
    key: "regular",
    label: "Reguler",
    glyph: "06",
    swatchClassName: "border-[#1F8F7E] bg-[#E3F4F1] text-[#14665A]",
    labelClassName: "font-medium text-stone-800",
  },
  {
    key: "selected",
    label: "Pilihanmu",
    glyph: "✓",
    swatchClassName: "border-[#D93A2F] bg-[#D93A2F] text-white",
    labelClassName: "font-semibold text-[#D93A2F]",
  },
  {
    key: "held",
    label: "Ditahan",
    glyph: "⋯",
    swatchClassName: "border-[#E9A12B] bg-[#E9A12B] text-[#2A1F2D]",
    labelClassName: "font-medium text-stone-700",
  },
  {
    key: "sold",
    label: "Terjual",
    glyph: "✕",
    swatchClassName: "border-[#6B5A6E] bg-[#6B5A6E] text-white",
    labelClassName: "font-medium text-stone-700",
  },
  {
    key: "blocked",
    label: "Terblokir",
    glyph: "⊘",
    swatchClassName: "border-[#9A8F95] text-[#5A4D5C]",
    labelClassName: "font-medium text-stone-700",
    swatchStyle: {
      background:
        "repeating-linear-gradient(45deg, #E6DFE3, #E6DFE3 3px, #D5CBD0 3px, #D5CBD0 6px)",
    },
  },
];

export function SeatLegend({ compact = false, className = "" }: SeatLegendProps) {
  return (
    <div
      className={`flex flex-col gap-2 w-full min-w-0 ${className}`}
      role="region"
      aria-label="Legenda status kursi"
    >
      <ul className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 w-full py-1 list-none">
        {LEGEND_ITEMS.map((item) => (
          <li
            key={item.key}
            className="inline-flex items-center gap-1 sm:gap-1.5 max-w-full px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/90 border border-stone-200/80 shadow-2xs"
          >
            <span
              className={`w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-[4px] sm:rounded-[5px] sm:rounded-b-[4px] border sm:border-2 font-bold text-[7px] sm:text-[9px] leading-none flex items-center justify-center shrink-0 select-none ${item.swatchClassName}`}
              style={item.swatchStyle}
              aria-hidden="true"
            >
              {item.glyph}
            </span>
            <span
              className={`text-[10px] sm:text-xs leading-tight whitespace-nowrap ${item.labelClassName}`}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      {!compact && (
        <p className="text-[11px] text-stone-500 text-center leading-relaxed">
          * Memilih belum mengunci kursi. Kursi ditahan selama <strong>10 menit</strong> setelah kamu menekan tombol Lanjut.
        </p>
      )}
    </div>
  );
}
