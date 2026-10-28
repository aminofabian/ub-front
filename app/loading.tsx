export default function Loading() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center bg-[#f4f1ea] px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <p
        className="premium-loading-mark text-[2.1rem] font-normal tracking-[-0.03em] text-[#121a16]"
        style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
      >
        Kiosk
      </p>
      <p className="premium-loading-caption mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#626d66]">
        Opening the shop
      </p>
      <span
        aria-hidden
        className="premium-loading-line mt-8 block h-px w-36 overflow-hidden bg-[rgba(18,26,22,0.12)]"
      >
        <span className="premium-loading-ink" />
      </span>
    </div>
  );
}
