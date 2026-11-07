// src/components/seat-map/SelectionSummaryClient.tsx
"use client";

import React from "react";
import { useBookingStore } from "@/lib/store/useBookingStore";
import { formatRupiah } from "@/lib/utils";

export function SelectionSummaryClient() {
  const selectedSeats = useBookingStore((state) => state.selectedSeats);
  const quotaItems = useBookingStore((state) => state.quotaItems);

  const quotaList = Object.values(quotaItems);
  const seatsTotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const quotaTotal = quotaList.reduce((sum, item) => sum + item.price * item.count, 0);
  const total = seatsTotal + quotaTotal;
  const totalCount =
    selectedSeats.length + quotaList.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="flex flex-col gap-3 my-3">
      <div className="selected-seat-list flex flex-col gap-2">
        {totalCount === 0 ? (
          <p className="empty-selection text-xs text-stone-500 italic p-3 bg-stone-50 rounded-lg text-center">
            Belum ada tiket dipilih. Pilih kursi atau area di denah untuk melanjutkan.
          </p>
        ) : (
          <>
            {/* Numbered Seats */}
            {selectedSeats.map((seat) => (
              <div
                className="selected-seat flex items-center justify-between p-2 rounded-lg bg-stone-50 text-xs"
                key={seat.id}
              >
                <div>
                  <span className="font-bold text-stone-900 mr-2">Kursi {seat.id}</span>
                  <span className="text-stone-500 text-[11px]">{seat.category}</span>
                </div>
                <strong className="text-stone-900 font-bold">{formatRupiah(seat.price)}</strong>
              </div>
            ))}

            {/* Quota / Standing Sections */}
            {quotaList.map((q) => (
              <div
                className="selected-seat flex items-center justify-between p-2 rounded-lg bg-stone-50 text-xs"
                key={q.sectionId}
              >
                <div>
                  <span className="font-bold text-stone-900 mr-2">{q.sectionName}</span>
                  <span className="text-stone-500 text-[11px]">
                    ({q.count}x @ {formatRupiah(q.price)})
                  </span>
                </div>
                <strong className="text-stone-900 font-bold">
                  {formatRupiah(q.price * q.count)}
                </strong>
              </div>
            ))}
          </>
        )}
      </div>

      {totalCount > 0 && (
        <div className="selection-total flex items-center justify-between pt-2 border-t border-stone-200 text-sm">
          <span className="text-stone-600 font-medium">
            Total <small className="text-stone-400">({totalCount} tiket)</small>
          </span>
          <strong className="text-base font-extrabold text-[#D93A2F]">
            {formatRupiah(total)}
          </strong>
        </div>
      )}
    </div>
  );
}
