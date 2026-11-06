"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, notFound } from "next/navigation";
import { useBookingStore } from "@/lib/store/useBookingStore";
import CountdownTimer from "@/components/shared/CountdownTimer";
import { getEventById } from "@/lib/data/events";

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderPageClient({ params }: OrderPageProps) {
  return (
    <Suspense
      fallback={
        <div className="page-container route-loading">
          Memuat pesanan...
        </div>
      }
    >
      <OrderPageContent params={params} />
    </Suspense>
  );
}

function OrderPageContent({ params }: OrderPageProps) {
  return <OrderForm params={params} />;
}

import { use } from "react";

function OrderForm({ params }: OrderPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const event = getEventById(id);
  if (!event) notFound();

  const { selectedSeats, isLocked, resetBooking } = useBookingStore();

  const [buyer, setBuyer] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [participants, setParticipants] = useState<Record<string, string>>(
    {}
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedSeats.length === 0 || !isLocked) {
      router.push(`/event/${id}/book`);
    }
  }, [selectedSeats, isLocked, id, router]);

  const totalPrice = selectedSeats.reduce(
    (sum, seat) => sum + seat.price,
    0
  );

  const handleParticipantChange = (seatId: string, name: string) => {
    setParticipants((prev) => ({
      ...prev,
      [seatId]: name,
    }));
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulasi proses payment gateway
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Hentikan timer tanpa melepas kursi
    const { clearLockTimer } = useBookingStore.getState();
    clearLockTimer();

    // Arahkan ke halaman e-ticket
    router.push(`/ticket/ORD-2026-${id}-99`);
  };

  if (selectedSeats.length === 0) return null;

  return (
    <div className="page-container checkout-page">
      <Link className="back-link" href={`/event/${event.id}/book`}>
        ← Kembali pilih kursi
      </Link>

      <div className="checkout-heading">
        <span className="eyebrow eyebrow-dark">SATU LANGKAH LAGI</span>
        <h1>Periksa pesananmu.</h1>
        <p>Pastikan detail tiket sudah sesuai sebelum melanjutkan.</p>
      </div>

      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Kolom Kiri: Formulir Data */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-display font-bold">
              Data Pemesanan
            </h2>

            <form
              id="order-form"
              onSubmit={handlePayment}
              className="space-y-6"
            >
              {/* Informasi Pemesan */}
              <div className="bg-white border border-summa-line rounded-2xl p-6 shadow-sm">
                <h3 className="font-display font-semibold mb-4 text-lg">
                  Informasi Pemesan
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-full">
                    <label className="block text-[13px] text-summa-muted mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full border border-summa-line rounded-lg p-3 outline-none focus:border-summa-primary"
                      value={buyer.name}
                      onChange={(e) =>
                        setBuyer({ ...buyer, name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] text-summa-muted mb-1">
                      Email
                    </label>
                    <input
                      required
                      type="email"
                      className="w-full border border-summa-line rounded-lg p-3 outline-none focus:border-summa-primary"
                      value={buyer.email}
                      onChange={(e) =>
                        setBuyer({ ...buyer, email: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] text-summa-muted mb-1">
                      No. WhatsApp
                    </label>
                    <input
                      required
                      type="tel"
                      className="w-full border border-summa-line rounded-lg p-3 outline-none focus:border-summa-primary"
                      value={buyer.phone}
                      onChange={(e) =>
                        setBuyer({ ...buyer, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Detail Peserta */}
              <div className="bg-white border border-summa-line rounded-2xl p-6 shadow-sm">
                <h3 className="font-display font-semibold mb-4 text-lg">
                  Detail Peserta
                </h3>

                <p className="text-[13px] text-summa-muted mb-4">
                  Setiap tiket wajib memiliki nama peserta yang akan hadir.
                </p>

                <div className="space-y-4">
                  {selectedSeats.map((seat, index) => (
                    <div
                      key={seat.id}
                      className="p-4 bg-summa-bg border border-summa-line rounded-xl"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-display font-bold">
                          Tiket {index + 1}
                        </span>

                        <span className="text-xs bg-summa-tint text-summa-primaryDark px-2 py-1 rounded-full font-medium">
                          {seat.area} · Kursi {seat.id}
                        </span>
                      </div>

                      <label className="block text-[13px] text-summa-muted mb-1">
                        Nama Peserta
                      </label>

                      <input
                        required
                        type="text"
                        placeholder="Sesuai kartu identitas"
                        className="w-full border border-summa-line rounded-lg p-3 outline-none focus:border-summa-primary bg-white"
                        value={participants[seat.id] || ""}
                        onChange={(e) =>
                          handleParticipantChange(seat.id, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>

          {/* Kolom Kanan: Ringkasan Pesanan */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-4">
              <CountdownTimer />

              <div className="bg-white border border-summa-line rounded-[20px] p-6 shadow-summa">
                <b className="font-display text-lg block mb-4">
                  Ringkasan Pesanan
                </b>

                <div className="space-y-3 mb-6">
                  {selectedSeats.map((seat) => (
                    <div
                      key={seat.id}
                      className="flex justify-between pb-3 border-b border-dashed border-summa-line text-[14px]"
                    >
                      <span>
                        {seat.area} · {seat.id}
                      </span>

                      <span>
                        Rp {seat.price.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-baseline mb-6 font-display font-extrabold text-2xl">
                  <span className="text-base text-summa-muted font-normal">
                    Total
                  </span>

                  <span>
                    Rp {totalPrice.toLocaleString("id-ID")}
                  </span>
                </div>

                <button
                  type="submit"
                  form="order-form"
                  disabled={isSubmitting}
                  className="w-full bg-summa-primary text-white font-display font-semibold py-3 px-6 rounded-full disabled:opacity-70 hover:bg-[#C23126] transition-colors"
                >
                  {isSubmitting ? "Memproses..." : "Bayar Sekarang"}
                </button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      resetBooking();
                      router.push(`/event/${id}/book`);
                    }}
                    className="text-[13px] text-summa-primary underline"
                  >
                    Batalkan Pesanan
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}