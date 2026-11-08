export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export interface SeatDisplayInput {
  id?: string | number;
  label?: string;
  seat_label?: string;
  row?: string;
  row_label?: string;
  number?: number | string;
  seat_number?: number | string;
  block?: string;
  block_code?: string;
  category?: string;
  category_name?: string;
  area?: string;
}

/**
 * Formats seat information clearly into Block, Row, and Seat Number.
 * e.g. "Blok A · Baris H · Kursi 05"
 */
export function formatSeatDisplayName(seat: SeatDisplayInput): string {
  const rawId = String(seat.id || seat.label || seat.seat_label || "").trim();
  const row = seat.row || seat.row_label;
  const num = seat.number ?? seat.seat_number;

  // Festival or quota areas without individual seat numbers
  if (
    rawId.toLowerCase().includes("festival") ||
    rawId.toLowerCase().includes("standing") ||
    rawId.toLowerCase().includes("tribun") ||
    rawId.toLowerCase().includes("quota")
  ) {
    return rawId;
  }

  // 1. Explicit row and seat number
  if (row && num !== undefined && num !== null) {
    const numInt = Number(num);
    const numFormatted = isNaN(numInt) ? String(num) : String(numInt).padStart(2, "0");
    const block =
      seat.block ||
      (seat.block_code === "BLOCK_A" ? "Blok A" : seat.block_code === "BLOCK_B" ? "Blok B" : "") ||
      (numInt <= 5 ? "Blok A" : "Blok B");
    return `${block} · Baris ${row} · Kursi ${numFormatted}`;
  }

  // 2. Pattern ATR-X-YY (e.g. ATR-H-05, ATR-B-10)
  const atrMatch = rawId.match(/ATR-([A-Z])-(\d+)/i);
  if (atrMatch) {
    const r = atrMatch[1].toUpperCase();
    const n = Number(atrMatch[2]);
    const block = n <= 5 ? "Blok A" : "Blok B";
    return `${block} · Baris ${r} · Kursi ${String(n).padStart(2, "0")}`;
  }

  // 3. Pattern A01 / H05 (single letter row + two digits)
  const letterNumMatch = rawId.match(/^([A-Z])(\d+)$/i);
  if (letterNumMatch) {
    const r = letterNumMatch[1].toUpperCase();
    const n = Number(letterNumMatch[2]);
    const block =
      seat.category?.toLowerCase().includes("premium") || n <= 5 ? "Blok A" : "Blok B";
    return `${block} · Baris ${r} · Kursi ${String(n).padStart(2, "0")}`;
  }

  // 4. Pattern "Kursi ATR-..." or "Kursi A01"
  if (rawId.toLowerCase().startsWith("kursi ")) {
    return formatSeatDisplayName({ ...seat, id: rawId.slice(6) });
  }

  return rawId ? `Kursi ${rawId}` : "Kursi Bernomor";
}

