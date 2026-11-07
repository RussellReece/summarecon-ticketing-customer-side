// src/components/seat-map/QuotaCard.tsx
//
// Component for STANDING and BOOK_BY_QUOTA sections.
// Displays section info, price, progress bar, stepper controls (touch target >= 48px),
// and prototype disclaimer.

"use client";

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
    sold,
    reserved,
    disabled = false,
  } = section;

  const totalUsed = sold + reserved;
  const fillPercentage =
    capacity > 0 ? Math.min(100, Math.round((totalUsed / capacity) * 100)) : 0;

  // Bar color: <80% Teal, 80-99% Amber, 100% Dark Plum
  let barColor = "bg-[#1F8F7E]";
  let statusBadgeText = `${available} tiket tersedia`;
  let statusBadgeClass = "bg-[#E3F4F1] text-[#14665A] border-[#1F8F7E]/30";

  if (available <= 0 || fillPercentage >= 100) {
    barColor = "bg-[#6B5A6E]";
    statusBadgeText = "Habis Terjual";
    statusBadgeClass = "bg-stone-200 text-stone-700 border-stone-300";
  } else if (fillPercentage >= 80) {
    barColor = "bg-[#E9A12B]";
    statusBadgeText = "Hampir Habis";
    statusBadgeClass = "bg-amber-100 text-amber-900 border-amber-300";
  }

  const isSoldOut = available <= 0 || disabled;
  const canIncrement = !isSoldOut && selectedCount < maxSelectable && selectedCount < available;
  const canDecrement = selectedCount > 0 && !disabled;

  return (
    <div
      className={`relative p-5 rounded-2xl border transition-all ${
        disabled
          ? "bg-stone-50 border-stone-200 opacity-60 cursor-not-allowed"
          : selectedCount > 0
          ? "bg-white border-[#D93A2F] shadow-md ring-1 ring-[#D93A2F]"
          : "bg-white border-stone-200 hover:border-stone-300 shadow-xs"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="inline-block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
            {section.bookingType === "STANDING" ? "Area Berdiri (Standing)" : "Area Kuota (Quota)"}
          </span>
          <h4 className="text-base sm:text-lg font-black text-stone-900 leading-snug">
            {sectionName}
          </h4>
          <p className="text-xs text-stone-500 mt-0.5">{categoryName}</p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-base sm:text-lg font-black text-[#D93A2F]">
            {formatRupiah(price)}
          </span>
          <span className="block text-[11px] text-stone-400">/ orang</span>
        </div>
      </div>

      {/* Progress / Capacity Bar */}
      <div className="my-3 p-3 bg-stone-50/80 rounded-xl border border-stone-100">
        <div className="flex items-center justify-between text-xs text-stone-600 mb-1.5">
          <span className="font-medium">
            Kapasitas: <strong>{totalUsed}/{capacity}</strong> terpakai
          </span>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}
          >
            {statusBadgeText}
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-stone-200/80 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-1 text-[10px] text-stone-400">
          <span>0</span>
          <span className="italic">Kapasitas contoh (prototype)</span>
          <span>{capacity}</span>
        </div>
      </div>

      {/* Stepper Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
        <span className="text-xs font-semibold text-stone-700">
          Jumlah Tiket:
        </span>

        <div className="flex items-center gap-2">
          {/* Decrement Button (Touch target >= 48px) */}
          <button
            type="button"
            className="w-12 h-12 flex items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-700 font-bold text-lg hover:bg-stone-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition select-none shadow-2xs"
            onClick={() => onCountChange(sectionId, selectedCount - 1)}
            disabled={!canDecrement}
            aria-label={`Kurangi 1 tiket ${sectionName}`}
          >
            −
          </button>

          <span
            className="w-10 text-center font-black text-base text-stone-900 select-none"
            aria-live="polite"
          >
            {selectedCount}
          </span>

          {/* Increment Button (Touch target >= 48px) */}
          <button
            type="button"
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#D93A2F] text-white font-bold text-lg hover:bg-[#c23329] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition select-none shadow-2xs"
            onClick={() => onCountChange(sectionId, selectedCount + 1)}
            disabled={!canIncrement}
            aria-label={`Tambah 1 tiket ${sectionName}`}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
