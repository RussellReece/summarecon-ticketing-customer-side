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
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-2 sm:gap-3 w-full py-1 text-xs text-stone-700">
        {/* Baris 1: 3 status di atas pada layar mobile */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 w-full sm:w-auto sm:flex sm:items-center">
          {/* Tersedia */}
          <div className="inline-flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-white/90 border border-stone-200/80 shadow-2xs">
            <span
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-[4px] sm:rounded-[5px] sm:rounded-b-[4px] border sm:border-2 border-[#1F8F7E] bg-[#E3F4F1] text-[#14665A] font-bold text-[8px] sm:text-[9px] flex items-center justify-center shrink-0 select-none"
              aria-hidden="true"
            >
              01
            </span>
            <span className="font-medium text-stone-800 text-[11px] sm:text-xs whitespace-nowrap">
              Tersedia
            </span>
          </div>

          {/* Pilihanmu */}
          <div className="inline-flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-white/90 border border-stone-200/80 shadow-2xs">
            <span
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-[4px] sm:rounded-[5px] sm:rounded-b-[4px] border sm:border-2 border-[#D93A2F] bg-[#D93A2F] text-white font-bold text-[9px] sm:text-[10px] flex items-center justify-center shrink-0 select-none"
              aria-hidden="true"
            >
              ✓
            </span>
            <span className="font-semibold text-[#D93A2F] text-[11px] sm:text-xs whitespace-nowrap">
              Pilihanmu
            </span>
          </div>

          {/* Ditahan */}
          <div className="inline-flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-white/90 border border-stone-200/80 shadow-2xs">
            <span
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-[4px] sm:rounded-[5px] sm:rounded-b-[4px] border sm:border-2 border-[#E9A12B] bg-[#E9A12B] text-[#2A1F2D] font-bold text-[8px] sm:text-[9px] flex items-center justify-center shrink-0 select-none"
              aria-hidden="true"
            >
              ⋯
            </span>
            <span className="font-medium text-stone-700 text-[11px] sm:text-xs whitespace-nowrap">
              Ditahan
            </span>
          </div>
        </div>

        {/* Baris 2: 2 status di bawahnya pada layar mobile */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Terjual */}
          <div className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-2.5 py-1.5 rounded-lg bg-white/90 border border-stone-200/80 shadow-2xs">
            <span
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-[4px] sm:rounded-[5px] sm:rounded-b-[4px] border sm:border-2 border-[#6B5A6E] bg-[#6B5A6E] text-white font-bold text-[8px] sm:text-[9px] flex items-center justify-center shrink-0 select-none"
              aria-hidden="true"
            >
              ✕
            </span>
            <span className="font-medium text-stone-700 text-[11px] sm:text-xs whitespace-nowrap">
              Terjual
            </span>
          </div>

          {/* Terblokir */}
          <div className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-2.5 py-1.5 rounded-lg bg-white/90 border border-stone-200/80 shadow-2xs">
            <span
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-[4px] sm:rounded-[5px] sm:rounded-b-[4px] border sm:border-2 border-[#9A8F95] text-[#5A4D5C] font-bold text-[8px] sm:text-[9px] flex items-center justify-center shrink-0 select-none"
              style={{
                background:
                  "repeating-linear-gradient(45deg, #E6DFE3, #E6DFE3 3px, #D5CBD0 3px, #D5CBD0 6px)",
              }}
              aria-hidden="true"
            >
              ⊘
            </span>
            <span className="font-medium text-stone-700 text-[11px] sm:text-xs whitespace-nowrap">
              Terblokir
            </span>
          </div>
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
