// src/components/seat-map/SelectionSummaryClient.tsx
//
// Client component displaying selected seats and quota items.
// Includes one-click chip removal ("A05 ✕"), itemized price calculation,
// and limit tracker (e.g. "2/4 dipilih").

"use client";

import React from "react";
import { useBookingStore } from "@/lib/store/useBookingStore";
import { formatRupiah, formatSeatDisplayName } from "@/lib/utils";

interface SelectionSummaryClientProps {
  maxTicketsTotal?: number;
}

export function SelectionSummaryClient({ maxTicketsTotal = 4 }: SelectionSummaryClientProps) {
  const eventId = useBookingStore((state) => state.eventId);
  const selectedSeats = useBookingStore((state) => state.selectedSeats);
  const quotaItems = useBookingStore((state) => state.quotaItems);
  const toggleSeat = useBookingStore((state) => state.toggleSeat);
  const setQuota = useBookingStore((state) => state.setQuota);

  const quotaList = Object.values(quotaItems);
  const seatsTotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const quotaTotal = quotaList.reduce((sum, item) => sum + item.price * item.count, 0);
  const total = seatsTotal + quotaTotal;
  const totalCount =
    selectedSeats.length + quotaList.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="flex flex-col gap-3 my-3">
      {/* Selection counter badge */}
      <div className="flex items-center justify-between text-xs text-stone-600 pb-2 border-b border-stone-100">
        <span className="font-semibold">Jumlah Tiket Dipilih:</span>
        <span
          className={`font-bold px-2 py-0.5 rounded-full text-xs ${
            totalCount > 0
              ? "bg-[#D93A2F]/10 text-[#D93A2F]"
              : "bg-stone-100 text-stone-500"
          }`}
        >
          {totalCount}/{maxTicketsTotal} dipilih
        </span>
      </div>

      <div className="selected-seat-list flex flex-col gap-2">
        {totalCount === 0 ? (
          <p className="empty-selection text-xs text-stone-500 italic p-3 bg-stone-50/80 rounded-xl text-center border border-dashed border-stone-200">
            Belum ada tiket dipilih. Pilih kursi atau area di denah untuk melanjutkan.
          </p>
        ) : (
          <>
            {/* Numbered Seats with Chip Remove Button (✕) */}
            {selectedSeats.map((seat) => (
              <div
                className="selected-seat flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs shadow-2xs hover:bg-stone-100/70 transition"
                key={seat.id}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSeat(eventId || "", seat)}
                    className="w-5 h-5 rounded-full bg-stone-200 hover:bg-[#D93A2F] hover:text-white text-stone-600 flex items-center justify-center font-bold text-[10px] transition shrink-0"
                    title={`Hapus kursi ${seat.id}`}
                    aria-label={`Hapus kursi ${seat.id}`}
                  >
                    ✕
                  </button>
                  <div>
                    <span className="font-extrabold text-stone-900 mr-1.5">
                      {formatSeatDisplayName(seat)}
                    </span>
                    <span className="text-stone-500 text-[11px] block sm:inline">
                      ({seat.category})
                    </span>
                  </div>
                </div>
                <strong className="text-stone-900 font-extrabold shrink-0">
                  {formatRupiah(seat.price)}
                </strong>
              </div>
            ))}

            {/* Quota / Standing Sections with decrement */}
            {quotaList.map((q) => (
              <div
                className="selected-seat flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs shadow-2xs hover:bg-stone-100/70 transition"
                key={q.sectionId}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuota({ ...q, count: Math.max(0, q.count - 1) })}
                    className="w-5 h-5 rounded-full bg-stone-200 hover:bg-[#D93A2F] hover:text-white text-stone-600 flex items-center justify-center font-bold text-[10px] transition shrink-0"
                    title={`Kurangi 1 ${q.sectionName}`}
                    aria-label={`Kurangi 1 ${q.sectionName}`}
                  >
                    ✕
                  </button>
                  <div>
                    <span className="font-extrabold text-stone-900 mr-1.5">
                      {q.sectionName}
                    </span>
                    <span className="text-stone-500 text-[11px] block sm:inline">
                      ({q.count}x @ {formatRupiah(q.price)})
                    </span>
                  </div>
                </div>
                <strong className="text-stone-900 font-extrabold shrink-0">
                  {formatRupiah(q.price * q.count)}
                </strong>
              </div>
            ))}
          </>
        )}
      </div>

      {totalCount > 0 && (
        <div className="selection-total flex items-center justify-between pt-3 border-t border-stone-200 text-sm">
          <span className="text-stone-700 font-bold">Total Pembayaran</span>
          <strong className="text-lg font-black text-[#D93A2F]">
            {formatRupiah(total)}
          </strong>
        </div>
      )}
    </div>
  );
}
