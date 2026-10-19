export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#f4f1ea] px-6 text-center">
      <p
        className="text-[2.1rem] font-normal tracking-[-0.03em] text-[#121a16]"
        style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
      >
        Kiosk
      </p>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#626d66]">
        Opening the shop
      </p>
      <span
        aria-hidden
        className="premium-loading-line mt-8 block h-px w-36 overflow-hidden bg-[rgba(18,26,22,0.12)]"
      >
        <span className="block h-px w-1/2 bg-[#1d4b3b]" />
      </span>
    </div>
  );
}
