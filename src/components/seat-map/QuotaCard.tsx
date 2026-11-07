// src/components/seat-map/QuotaCard.tsx
//
// Component for STANDING and BOOK_BY_QUOTA sections.
// Displays section info, price, progress bar, stepper controls, and prototype disclaimer.

import React from "react";
import { formatRupiah } from "@/lib/utils";

export interface QuotaSectionData {
  sectionId: string;
  sectionName: string;
  categoryName: string;
  price: number;
  capacity: number;
  sold: number;
  reserved: number;
  available: number;
  bookingType: "STANDING" | "BOOK_BY_QUOTA";
  disabled?: boolean;
}

interface QuotaCardProps {
  section: QuotaSectionData;
  selectedCount: number;
  maxSelectable: number;
  onCountChange: (sectionId: string, count: number) => void;
}

export function QuotaCard({
  section,
  selectedCount,
  maxSelectable,
  onCountChange,
}: QuotaCardProps) {
  const {
    sectionId,
    sectionName,
    categoryName,
    price,
    capacity,
    available,
    disabled = false,
  } = section;

  const totalUsed = capacity - available;
  const fillPercentage = capacity > 0 ? Math.min(100, Math.round((totalUsed / capacity) * 100)) : 0;

  // Bar color: <80% Teal, 80-99% Amber, 100% Plum/Dark
  let barColor = "bg-[#1F8F7E]";
  if (fillPercentage >= 100) {
    barColor = "bg-[#6B5A6E]";
  } else if (fillPercentage >= 80) {
    barColor = "bg-[#E9A12B]";
  }

  const isSoldOut = available <= 0 || disabled;
  const canIncrement = !isSoldOut && selectedCount < maxSelectable && selectedCount < available;
  const canDecrement = selectedCount > 0;

  return (
    <div
      className={`relative p-4 rounded-xl border transition-all ${
        disabled
          ? "bg-stone-50 border-stone-200 opacity-60 cursor-not-allowed"
          : selectedCount > 0
          ? "bg-white border-[#D93A2F] shadow-sm ring-1 ring-[#D93A2F]"
          : "bg-white border-stone-200 hover:border-stone-300 shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <span className="inline-block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-0.5">
            {section.bookingType === "STANDING" ? "Area Berdiri (Standing)" : "Area Kuota (Quota)"}
          </span>
          <h4 className="text-base font-bold text-stone-900 leading-tight">
            {sectionName}
          </h4>
          <p className="text-xs text-stone-500">{categoryName}</p>
        </div>

        <div className="text-right">
          <span className="text-base font-bold text-[#D93A2F]">
            {formatRupiah(price)}
          </span>
          <span className="block text-[11px] text-stone-400">/ orang</span>
        </div>
      </div>

      {/* Progress / Capacity Bar */}
      <div className="mt-3 mb-3">
        <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
          <span>Ketersediaan:</span>
          <span className="font-medium text-stone-700">
            {isSoldOut ? "Habis" : `${available} tiket tersisa`}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-[10px] text-stone-400 italic">
            Kapasitas contoh (prototype): {capacity}
          </span>
          <span className="text-[10px] font-medium text-stone-500">
            {fillPercentage}% terisi
          </span>
        </div>
      </div>

      {/* Controls & Stepper */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
        <span className="text-xs font-medium text-stone-700">
          Jumlah Tiket:
        </span>

        {isSoldOut ? (
          <span className="text-xs font-semibold text-stone-500 px-3 py-1 bg-stone-100 rounded-full">
            {disabled ? "Tidak Tersedia" : "Tiket Habis"}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canDecrement}
              onClick={() => onCountChange(sectionId, selectedCount - 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-stone-200 text-stone-700 font-bold hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label={`Kurangi tiket ${sectionName}`}
            >
              -
            </button>
            <span className="w-8 text-center font-bold text-sm text-stone-900">
              {selectedCount}
            </span>
            <button
              type="button"
              disabled={!canIncrement}
              onClick={() => onCountChange(sectionId, selectedCount + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#D93A2F] text-white font-bold hover:bg-[#c23329] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
              aria-label={`Tambah tiket ${sectionName}`}
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

