"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export type BookingStepNumber = 1 | 2 | 3;

export interface BookingProgressBarProps {
  currentStep: BookingStepNumber;
  eventId?: string;
  /**
   * Callback saat pengguna mengklik langkah yang sudah dilewati (`step < currentStep`).
   */
  onStepClick?: (step: BookingStepNumber) => void;
  className?: string;
}

interface StepDefinition {
  step: BookingStepNumber;
  title: string;
  mobileTitle: string;
  subtitle: string;
}

const BOOKING_STEPS: StepDefinition[] = [
  {
    step: 1,
    title: "Pilih Kursi",
    mobileTitle: "Pilih Kursi",
    subtitle: "Denah & kategori",
  },
  {
    step: 2,
    title: "Isi Data Diri",
    mobileTitle: "Data Diri",
    subtitle: "Data pemesan & peserta",
  },
  {
    step: 3,
    title: "Pembayaran",
    mobileTitle: "Pembayaran",
    subtitle: "Selesaikan via QRIS",
  },
];

export function BookingProgressBar({
  currentStep,
  eventId,
  onStepClick,
  className = "",
}: BookingProgressBarProps) {
  const router = useRouter();
  const staticRef = useRef<HTMLDivElement>(null);
  const [isScrolledPast, setIsScrolledPast] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleStepClick = (step: BookingStepNumber) => {
    if (step >= currentStep) return;

    if (onStepClick) {
      onStepClick(step);
      return;
    }

    if (eventId) {
      if (step === 1) {
        router.push(`/event/${eventId}/book`);
      } else if (step === 2) {
        router.push(`/order/${eventId}`);
      }
    }
  };

  const progressPercent = currentStep === 1 ? 33 : currentStep === 2 ? 67 : 100;

  useEffect(() => {
    const el = staticRef.current;
    if (!el) return;

    const updateScrolledState = () => {
      const rect = el.getBoundingClientRect();
      const headerH = window.innerWidth <= 600 ? 76 : 88;
      setIsScrolledPast(rect.bottom < headerH);
    };

    const headerH = window.innerWidth <= 600 ? 76 : 88;
    let observer: IntersectionObserver | null = null;

    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const h = window.innerWidth <= 600 ? 76 : 88;
            setIsScrolledPast(!entry.isIntersecting && entry.boundingClientRect.bottom < h);
          }
        },
        {
          rootMargin: `-${headerH}px 0px 0px 0px`,
          threshold: 0,
        }
      );
      observer.observe(el);
    }

    window.addEventListener("scroll", updateScrolledState, { passive: true });
    window.addEventListener("resize", updateScrolledState, { passive: true });
    updateScrolledState();

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("scroll", updateScrolledState);
      window.removeEventListener("resize", updateScrolledState);
    };
  }, []);

  return (
    <>
      {/* 1. Static Full Progress Bar (Always present in normal document flow at top of page) */}
      <div ref={staticRef} className={`w-full mb-5 ${className}`}>
        <nav
          aria-label="Tahapan pemesanan tiket"
          className="w-full rounded-2xl bg-white border border-[#E8DFC9] p-3.5 sm:p-4 shadow-2xs"
        >
          {/* Top Meta Row: Step counter + percentage */}
          <div className="flex items-center justify-between text-[11px] mb-2.5">
            <span className="font-bold uppercase tracking-wider text-[#2A1F2D]">
              Langkah {currentStep} dari 3
            </span>
            <span className="font-semibold text-stone-500 tabular-nums">
              {progressPercent}% selesai
            </span>
          </div>

          {/* Smooth Animated Progress Bar */}
          <div
            className="w-full h-1.5 rounded-full bg-[#F3EFEA] overflow-hidden mb-3.5"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1F8F7E] via-[#D93A2F] to-[#F4A23B] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Stepper Row (Mobile 360px compact horizontal & Desktop spacious layout) */}
          <ol className="flex items-center justify-between w-full list-none m-0 p-0">
            {BOOKING_STEPS.map((item, idx) => {
              const isCompleted = item.step < currentStep;
              const isActive = item.step === currentStep;
              const isUpcoming = item.step > currentStep;
              const isClickable = isCompleted;

              const circleClass = isCompleted
                ? "bg-[#1F8F7E] text-white border border-[#1F8F7E]"
                : isActive
                ? "bg-[#D93A2F] text-white ring-4 ring-[#D93A2F]/15 border border-[#D93A2F]"
                : "bg-[#F3EFEA] text-[#9A8F95] border border-[#E5DEC9]";

              const titleClass = isCompleted
                ? "font-bold text-[#2A1F2D] group-hover/btn:text-[#D93A2F]"
                : isActive
                ? "font-bold text-[#D93A2F]"
                : "font-semibold text-[#9A8F95]";

              return (
                <React.Fragment key={item.step}>
                  <li className="shrink-0">
                    <button
                      type="button"
                      disabled={isUpcoming || isActive}
                      aria-current={isActive ? "step" : undefined}
                      onClick={() => {
                        if (isClickable) {
                          handleStepClick(item.step);
                        }
                      }}
                      title={
                        isClickable
                          ? `Kembali ke langkah ${item.step}: ${item.title}`
                          : item.title
                      }
                      className={`group/btn flex flex-col sm:flex-row items-center gap-1 sm:gap-2.5 text-center sm:text-left rounded-xl px-1 sm:px-2.5 py-1 transition-all duration-200 ${
                        isClickable
                          ? "cursor-pointer hover:bg-[#FDF6F0]"
                          : isActive
                          ? "cursor-default"
                          : "cursor-not-allowed opacity-85"
                      }`}
                    >
                      {/* Step Circle */}
                      <span
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-extrabold flex items-center justify-center shrink-0 transition-all duration-300 ${circleClass}`}
                      >
                        {isCompleted ? "✓" : item.step}
                      </span>

                      {/* Step Labels */}
                      <span className="flex flex-col leading-tight">
                        <span className={`sm:hidden text-[11px] whitespace-nowrap transition-colors ${titleClass}`}>
                          {item.mobileTitle}
                        </span>
                        <span className={`hidden sm:inline text-xs md:text-sm whitespace-nowrap transition-colors ${titleClass}`}>
                          {item.title}
                        </span>
                        <span className="hidden md:inline text-[11px] text-stone-500 font-normal whitespace-nowrap mt-0.5">
                          {item.subtitle}
                        </span>
                      </span>
                    </button>
                  </li>

                  {/* Connector Line between steps */}
                  {idx < BOOKING_STEPS.length - 1 && (
                    <li
                      aria-hidden="true"
                      className="flex-1 h-1 mx-1.5 sm:mx-3 rounded-full bg-[#F3EFEA] overflow-hidden"
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.step < currentStep ? "w-full bg-[#1F8F7E]" : "w-0 bg-transparent"
                        }`}
                      />
                    </li>
                  )}
                </React.Fragment>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* 2. Floating Progress Bar (Shown when user has scrolled past the static progress bar) */}
      <div
        className={`fixed top-[var(--header-h)] left-0 right-0 z-[45] transition-all duration-200 ease-out ${
          isScrolledPast
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        aria-hidden={!isScrolledPast}
      >
        <div className="w-full bg-white border-b border-[#E8DFC9] shadow-2xs">
          <div className="w-full max-w-6xl mx-auto px-4 py-1.5 sm:py-2">
            <div
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group relative w-full cursor-pointer"
            >
              {/* Floating Progress Bar Line: Identik dengan garis progress bar lengkap (warna solid & tegas, tanpa disamarkan) */}
              <div
                className="w-full h-1.5 sm:h-2 rounded-full bg-[#F3EFEA] border border-[#E8DFC9]/80 overflow-hidden relative shadow-2xs"
                role="progressbar"
                aria-label={`Progres pemesanan: Langkah ${currentStep} dari 3 (${progressPercent}% selesai)`}
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                title="Arahkan kursor untuk melihat detail tahapan pemesanan"
              >
                {/* Garis progres aktif dengan warna gradient yang persis sama dengan progress bar lengkap */}
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#1F8F7E] via-[#D93A2F] to-[#F4A23B] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />

                {/* Clickable overlay regions untuk navigasi kembali ke langkah yang telah diselesaikan */}
                <div className="absolute inset-0 grid grid-cols-3">
                  {BOOKING_STEPS.map((s) => {
                    const isClickable = s.step < currentStep;
                    return (
                      <button
                        key={s.step}
                        type="button"
                        disabled={!isClickable}
                        onClick={(e) => {
                          if (isClickable) {
                            e.stopPropagation();
                            handleStepClick(s.step);
                          }
                        }}
                        className={`h-full w-full ${isClickable ? "cursor-pointer hover:bg-black/5" : "cursor-default"}`}
                        title={isClickable ? `Kembali ke langkah ${s.step}: ${s.title}` : undefined}
                        aria-label={isClickable ? `Kembali ke langkah ${s.step}: ${s.title}` : undefined}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Desktop Hover Expansion: Full Interactive Stepper Card (hidden md:block) */}
              <div
                className={`hidden md:block absolute top-full left-0 right-0 pt-2 transition-all duration-200 ease-out z-50 ${
                  isHovered
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 -translate-y-1 pointer-events-none"
                }`}
              >
                <div className="w-full rounded-2xl bg-white/98 backdrop-blur-md border border-[#E8DFC9] p-4 shadow-xl">
                  {/* Header row inside hover card */}
                  <div className="flex items-center justify-between text-[11px] mb-2.5 pb-2 border-b border-stone-100">
                    <span className="font-bold uppercase tracking-wider text-[#2A1F2D]">
                      Langkah {currentStep} dari 3
                    </span>
                    <span className="font-semibold text-stone-500 tabular-nums">
                      {progressPercent}% selesai
                    </span>
                  </div>

                  {/* Smooth Animated Progress Bar inside hover card */}
                  <div
                    className="w-full h-1.5 rounded-full bg-[#F3EFEA] overflow-hidden mb-3.5"
                    role="progressbar"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1F8F7E] via-[#D93A2F] to-[#F4A23B] transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Stepper items row inside hover card */}
                  <ol className="flex items-center justify-between w-full list-none m-0 p-0">
                    {BOOKING_STEPS.map((item, idx) => {
                      const isCompleted = item.step < currentStep;
                      const isActive = item.step === currentStep;
                      const isUpcoming = item.step > currentStep;
                      const isClickable = isCompleted;

                      const circleClass = isCompleted
                        ? "bg-[#1F8F7E] text-white border border-[#1F8F7E]"
                        : isActive
                        ? "bg-[#D93A2F] text-white ring-4 ring-[#D93A2F]/15 border border-[#D93A2F]"
                        : "bg-[#F3EFEA] text-[#9A8F95] border border-[#E5DEC9]";

                      const titleClass = isCompleted
                        ? "font-bold text-[#2A1F2D] group-hover/btn:text-[#D93A2F]"
                        : isActive
                        ? "font-bold text-[#D93A2F]"
                        : "font-semibold text-[#9A8F95]";

                      return (
                        <React.Fragment key={item.step}>
                          <li className="flex-1">
                            <button
                              type="button"
                              disabled={isUpcoming || isActive}
                              aria-current={isActive ? "step" : undefined}
                              onClick={() => {
                                if (isClickable) {
                                  handleStepClick(item.step);
                                }
                              }}
                              className={`group/btn w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200 text-left ${
                                isClickable
                                  ? "cursor-pointer hover:bg-[#FDFBF7]"
                                  : isActive
                                  ? "cursor-default"
                                  : "cursor-not-allowed opacity-60"
                              }`}
                            >
                              {/* Step Circle Badge */}
                              <span
                                className={`w-8 h-8 rounded-full text-sm font-extrabold flex items-center justify-center shrink-0 transition-all duration-300 ${circleClass}`}
                              >
                                {isCompleted ? "✓" : item.step}
                              </span>

                              {/* Step text details */}
                              <span className="flex flex-col leading-tight min-w-0">
                                <span className={`text-xs font-bold whitespace-nowrap ${titleClass}`}>
                                  {item.title}
                                </span>
                                <span className="text-[11px] text-stone-500 font-normal whitespace-nowrap mt-0.5">
                                  {item.subtitle}
                                </span>
                              </span>
                            </button>
                          </li>

                          {/* Connector Line */}
                          {idx < BOOKING_STEPS.length - 1 && (
                            <li
                              aria-hidden="true"
                              className="w-8 sm:w-12 h-1 mx-2 rounded-full bg-[#F3EFEA] overflow-hidden shrink-0"
                            >
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  item.step < currentStep ? "w-full bg-[#1F8F7E]" : "w-0 bg-transparent"
                                }`}
                              />
                            </li>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
