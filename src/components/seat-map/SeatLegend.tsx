// src/components/seat-map/SeatLegend.tsx
//
// Accessible Legend displaying seat statuses per Style Guide:
// Uses uniform mini-seat components for consistency.
// - Tersedia: Tint #E3F4F1, border 2px #1F8F7E, text #14665A
// - Pilihanmu: Solid #D93A2F, white text, "✓"
// - Ditahan: Solid #E9A12B, Plum Ink text, "⋯"
// - Terjual: Solid #6B5A6E, white text, "✕"
// - Terblokir: Diagonal hatch #E6DFE3, border #9A8F95, "⊘"

"use client";

import React from "react";

interface SeatLegendProps {
  compact?: boolean;
  className?: string;
}

export function SeatLegend({ compact = false, className = "" }: SeatLegendProps) {
  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      role="region"
      aria-label="Legenda status kursi"
    >
      <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1 px-1 text-xs text-stone-700 justify-start sm:justify-center no-scrollbar">
        {/* Tersedia */}
        <div className="inline-flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg bg-white/80 border border-stone-200/60 shadow-2xs">
          <span
            className="w-5 h-5 rounded-[5px] rounded-b-[4px] border-2 border-[#1F8F7E] bg-[#E3F4F1] text-[#14665A] font-bold text-[9px] flex items-center justify-center select-none"
            aria-hidden="true"
          >
            01
          </span>
          <span className="font-medium text-stone-800">Tersedia</span>
        </div>

        {/* Pilihanmu */}
        <div className="inline-flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg bg-white/80 border border-stone-200/60 shadow-2xs">
          <span
            className="w-5 h-5 rounded-[5px] rounded-b-[4px] border-2 border-[#D93A2F] bg-[#D93A2F] text-white font-bold text-[10px] flex items-center justify-center select-none"
            aria-hidden="true"
          >
            ✓
          </span>
          <span className="font-semibold text-[#D93A2F]">Pilihanmu</span>
        </div>

        {/* Ditahan */}
        <div className="inline-flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg bg-white/80 border border-stone-200/60 shadow-2xs">
          <span
            className="w-5 h-5 rounded-[5px] rounded-b-[4px] border-2 border-[#E9A12B] bg-[#E9A12B] text-[#2A1F2D] font-bold text-[9px] flex items-center justify-center select-none"
            aria-hidden="true"
          >
            ⋯
          </span>
          <span className="font-medium text-stone-700">Ditahan</span>
        </div>

        {/* Terjual */}
        <div className="inline-flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg bg-white/80 border border-stone-200/60 shadow-2xs">
          <span
            className="w-5 h-5 rounded-[5px] rounded-b-[4px] border-2 border-[#6B5A6E] bg-[#6B5A6E] text-white font-bold text-[9px] flex items-center justify-center select-none"
            aria-hidden="true"
          >
            ✕
          </span>
          <span className="font-medium text-stone-700">Terjual</span>
        </div>

        {/* Terblokir */}
        <div className="inline-flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg bg-white/80 border border-stone-200/60 shadow-2xs">
          <span
            className="w-5 h-5 rounded-[5px] rounded-b-[4px] border-2 border-[#9A8F95] text-[#5A4D5C] font-bold text-[9px] flex items-center justify-center select-none"
            style={{
              background:
                "repeating-linear-gradient(45deg, #E6DFE3, #E6DFE3 3px, #D5CBD0 3px, #D5CBD0 6px)",
            }}
            aria-hidden="true"
          >
            ⊘
          </span>
          <span className="font-medium text-stone-700">Terblokir</span>
        </div>
      </div>

      {!compact && (
        <p className="text-[11px] text-stone-500 text-center leading-relaxed">
          * Memilih belum mengunci kursi. Kursi ditahan selama <strong>10 menit</strong> setelah kamu menekan tombol Lanjut.
        </p>
      )}
    </div>
  );
}
