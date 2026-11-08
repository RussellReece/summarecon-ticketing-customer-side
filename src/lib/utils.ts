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
  seat_id?: string | number;
  event_seat_id?: string | number;
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
  seat?: SeatDisplayInput | null;
  ticket_category?: {
    name?: string;
  } | null;
}

/**
 * Formats seat information clearly into Block, Row, and Seat Number.
 * e.g. "Blok A · Baris H · Kursi 05"
 */
export function formatSeatDisplayName(input: SeatDisplayInput | null | undefined): string {
  if (!input) return "Kursi Bernomor";

  const seat: SeatDisplayInput = input.seat ? { ...input, ...input.seat } : input;
  const preferredLabel = String(seat.seat_label || seat.label || "").trim();

  // If already formatted as "Blok X · Baris Y · Kursi Z" (or with hyphens), normalize and return
  if (/^Blok\s+.+(?:·|-)\s*Baris\s+.+(?:·|-)\s*Kursi\s+/i.test(preferredLabel)) {
    return preferredLabel.replace(/\s+-\s+/g, " · ");
  }

  // Festival or quota areas without individual seat numbers (e.g. "Festival Standing (#1)")
  if (
    preferredLabel &&
    (preferredLabel.toLowerCase().includes("festival") ||
      preferredLabel.toLowerCase().includes("standing") ||
      preferredLabel.toLowerCase().includes("tribun") ||
      preferredLabel.toLowerCase().includes("quota") ||
      preferredLabel.includes("(#"))
  ) {
    return preferredLabel;
  }

  const rawId = String(
    seat.event_seat_id || seat.seat_id || seat.seat_label || seat.label || seat.id || ""
  ).trim();
  const row = seat.row || seat.row_label;
  const num = seat.number ?? seat.seat_number;
  const resolvedCategory =
    seat.category || seat.category_name || seat.ticket_category?.name || "";

  if (
    rawId.toLowerCase().includes("festival") ||
    rawId.toLowerCase().includes("standing") ||
    rawId.toLowerCase().includes("tribun") ||
    rawId.toLowerCase().includes("quota") ||
    rawId.includes("(#")
  ) {
    return rawId;
  }

  if (/^Blok\s+.+(?:·|-)\s*Baris\s+.+(?:·|-)\s*Kursi\s+/i.test(rawId)) {
    return rawId.replace(/\s+-\s+/g, " · ");
  }

  // 1. Explicit row and seat number
  if (row && num !== undefined && num !== null && String(num).trim() !== "") {
    const numInt = Number(num);
    const numFormatted = isNaN(numInt) ? String(num) : String(numInt).padStart(2, "0");
    const block =
      seat.block ||
      (seat.block_code === "BLOCK_A"
        ? "Blok A"
        : seat.block_code === "BLOCK_B"
          ? "Blok B"
          : "") ||
      (numInt <= 5 ? "Blok A" : "Blok B");
    return `${block} · Baris ${String(row).toUpperCase()} · Kursi ${numFormatted}`;
  }

  // 2. Pattern ATR-X-YY / SWG-X-YY / DWT-X-YY (e.g. ATR-H-05, SWG-B-10)
  const venueCodeMatch = rawId.match(/(?:ATR|SWG|DWT|SEAT)-([A-Z])-(\d+)/i);
  if (venueCodeMatch) {
    const r = venueCodeMatch[1].toUpperCase();
    const n = Number(venueCodeMatch[2]);
    const block =
      seat.block ||
      (seat.block_code === "BLOCK_A"
        ? "Blok A"
        : seat.block_code === "BLOCK_B"
          ? "Blok B"
          : "") ||
      (n <= 5 ? "Blok A" : "Blok B");
    return `${block} · Baris ${r} · Kursi ${String(n).padStart(2, "0")}`;
  }

  // 3. Pattern A01 / H05 or A-01 / H-05 (single letter row + digits)
  const letterNumMatch = rawId.match(/^([A-Z])-?(\d+)$/i);
  if (letterNumMatch) {
    const r = letterNumMatch[1].toUpperCase();
    const n = Number(letterNumMatch[2]);
    const block =
      seat.block ||
      (seat.block_code === "BLOCK_A"
        ? "Blok A"
        : seat.block_code === "BLOCK_B"
          ? "Blok B"
          : "") ||
      (resolvedCategory.toLowerCase().includes("premium") || n <= 5 ? "Blok A" : "Blok B");
    return `${block} · Baris ${r} · Kursi ${String(n).padStart(2, "0")}`;
  }

  // 4. Pattern "Kursi ATR-..." or "Kursi A01"
  if (rawId.toLowerCase().startsWith("kursi ")) {
    return formatSeatDisplayName({ ...seat, seat_label: undefined, label: undefined, event_seat_id: undefined, seat_id: undefined, id: rawId.slice(6) });
  }

  return preferredLabel || (rawId ? `Kursi ${rawId}` : "Kursi Bernomor");
}

