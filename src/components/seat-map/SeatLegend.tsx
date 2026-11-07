// src/components/seat-map/SeatLegend.tsx
//
// Accessible Legend displaying seat and section statuses per Style Guide:
// Teal (Available), Vermilion+✓ (Selected), Amber+⋯ (Held), Plum+✕ (Sold), Gray (Blocked)

import React from "react";

export function SeatLegend() {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-4 text-xs text-stone-700 bg-stone-50/80 p-3 rounded-lg border border-stone-200/60"
      role="region"
      aria-label="Legenda status kursi"
    >
      {/* Tersedia */}
      <span className="flex items-center gap-1.5 font-medium">
        <span
          className="w-4 h-4 rounded-full bg-[#1F8F7E] text-white flex items-center justify-center text-[10px] font-bold shadow-sm"
          aria-hidden="true"
        >
          ●
        </span>
        Tersedia
      </span>

      {/* Pilihanmu */}
      <span className="flex items-center gap-1.5 font-medium">
        <span
          className="w-4 h-4 rounded-full bg-[#D93A2F] text-white flex items-center justify-center text-[11px] font-bold ring-2 ring-[#D93A2F]/20 shadow-sm"
          aria-hidden="true"
        >
          ✓
        </span>
        Pilihanmu
      </span>

      {/* Ditahan */}
      <span className="flex items-center gap-1.5 font-medium">
        <span
          className="w-4 h-4 rounded-full bg-[#E9A12B] text-white flex items-center justify-center text-[10px] font-bold shadow-sm"
          aria-hidden="true"
        >
          ⋯
        </span>
        Ditahan (10m)
      </span>

      {/* Terisi / Terjual */}
      <span className="flex items-center gap-1.5 font-medium">
        <span
          className="w-4 h-4 rounded-full bg-[#6B5A6E] text-white flex items-center justify-center text-[10px] font-bold shadow-sm"
          aria-hidden="true"
        >
          ✕
        </span>
        Terisi
      </span>

      {/* Terblokir */}
      <span className="flex items-center gap-1.5 font-medium">
        <span
          className="w-4 h-4 rounded-full bg-stone-300 text-stone-600 flex items-center justify-center text-[10px] font-bold shadow-sm"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
          }}
          aria-hidden="true"
        >
          ⊘
        </span>
        Terblokir
      </span>
    </div>
  );
}

