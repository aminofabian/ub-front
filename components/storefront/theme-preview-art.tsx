"use client";

import { cn } from "@/lib/utils";

/**
 * Static illustrated theme previews for the dashboard atelier.
 * Live storefront iframes are often blocked by frame ancestors — these always render.
 */
export function ThemePreviewArt({
  templateId,
  className,
}: {
  templateId: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-black/10 shadow-inner",
        className,
      )}
    >
      <ArtForId id={templateId} />
    </div>
  );
}

function ArtForId({ id }: { id: string }) {
  switch (id) {
    case "mart":
      return <MartArt />;
    case "butcher-board":
      return <ButcherArt />;
    case "boutique-shelf":
      return <BoutiqueArt />;
    case "spirits-cellar":
      return <SpiritsArt />;
    case "oxide":
      return <OxideArt />;
    case "tint-lab":
      return <TintArt />;
    case "milk-run":
      return <MilkRunArt />;
    case "coming-soon-editorial":
      return <ComingSoonArt />;
    case "neighborhood-board":
      return <NeighborhoodArt />;
    case "fresh-market":
      return <FreshArt />;
    case "butchery-cut":
      return <ButcheryCutArt />;
    case "minimart-hours":
      return <MinimartHoursArt />;
    case "brand-poster":
      return <BrandPosterArt />;
    default:
      return <MartArt />;
  }
}

function Frame({
  children,
  paper,
  ink = "#141816",
}: {
  children: React.ReactNode;
  paper: string;
  ink?: string;
}) {
  return (
    <div
      className="flex aspect-[16/10] w-full flex-col"
      style={{ background: paper, color: ink }}
    >
      {children}
    </div>
  );
}

function MartArt() {
  return (
    <Frame paper="#F8FAF5">
      <div className="flex items-center gap-2 border-b border-emerald-200/80 bg-white/70 px-3 py-2">
        <span className="size-5 rounded-full bg-emerald-600" />
        <span className="h-2 w-16 rounded bg-emerald-900/20" />
        <span className="ml-auto h-5 w-12 rounded-full bg-emerald-600/90" />
      </div>
      <div className="grid flex-1 grid-cols-[1.4fr_1fr] gap-2 p-2.5">
        <div className="rounded-lg bg-gradient-to-br from-emerald-200 to-lime-100 p-2">
          <div className="h-2 w-2/3 rounded bg-emerald-900/30" />
          <div className="mt-2 h-2 w-1/2 rounded bg-emerald-900/15" />
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded bg-white/70" />
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 rounded-md bg-white shadow-sm ring-1 ring-emerald-100" />
          ))}
        </div>
      </div>
    </Frame>
  );
}

function ButcherArt() {
  return (
    <Frame paper="#0C0708" ink="#F4E6C8">
      <div className="flex items-center justify-between border-b-2 border-[#C9A227] bg-black/40 px-3 py-1.5">
        <span className="text-[11px] font-black uppercase tracking-wide text-[#F5C518]">
          Cloud 9
        </span>
        <span className="bg-[#F5C518] px-1.5 py-0.5 text-[7px] font-bold uppercase text-[#1A0B0B]">
          Cart · 2
        </span>
      </div>
      <div className="grid flex-1 grid-cols-[1.4fr_1fr] gap-1.5 p-2">
        <div className="relative overflow-hidden border-2 border-[#F5C518] bg-gradient-to-br from-[#C41E2A] to-[#1A0B12]">
          <div className="absolute bottom-1.5 left-1.5 right-1.5">
            <div className="h-2 w-3/4 bg-[#F5C518]" />
            <div className="mt-1 h-4 w-12 border border-[#F5C518] bg-[#E31C23]" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {["#8B1219", "#C41E2A", "#5C0D14"].map((c) => (
            <div
              key={c}
              className="flex min-h-0 flex-1 border-2 border-[#C9A227]"
              style={{ background: c }}
            >
              <div className="w-2/5 bg-black/25" />
              <div className="flex flex-1 flex-col justify-center gap-1 p-1">
                <div className="h-1.5 w-3/4 bg-[#F5C518]/80" />
                <div className="h-1 w-1/3 bg-white/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function BoutiqueArt() {
  return (
    <Frame paper="#FDF2F8">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="font-serif text-[11px] italic text-pink-800">Boutique</span>
        <span className="size-4 rounded-full bg-pink-500" />
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2 px-2.5 pb-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-pink-100"
          >
            <div
              className="aspect-[4/3]"
              style={{
                background: `linear-gradient(145deg, ${
                  ["#FBCFE8", "#F9A8D4", "#FCE7F3", "#FDF2F8"][i]
                }, #fff)`,
              }}
            />
            <div className="space-y-1 p-2">
              <div className="h-1.5 w-2/3 rounded bg-pink-900/20" />
              <div className="h-1.5 w-1/3 rounded bg-pink-500/50" />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function SpiritsArt() {
  return (
    <Frame paper="#0F172A" ink="#E2E8F0">
      <div className="border-b border-violet-400/20 px-3 py-2">
        <div className="h-2 w-24 rounded bg-violet-300/40" />
      </div>
      <div className="flex flex-1 items-end justify-around gap-1 px-3 pb-3 pt-4">
        {[28, 40, 34, 44, 30].map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="w-6 rounded-t-md bg-gradient-to-b from-violet-300/80 to-indigo-900 ring-1 ring-violet-200/30"
              style={{ height: h }}
            />
            <div className="h-1 w-5 rounded bg-white/20" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

function OxideArt() {
  return (
    <Frame paper="#EDEAE2" ink="#1A1A1A">
      <div className="flex items-center justify-between border-b-2 border-black px-2 py-1.5 font-mono text-[9px] uppercase tracking-widest">
        <span>Oxide · archive</span>
        <span className="text-[#FF3D1F]">04</span>
      </div>
      <div className="grid flex-1 grid-cols-4 gap-px bg-black p-px">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-[#EDEAE2] p-1.5">
            <div className="font-mono text-[7px] text-black/40">OX-{i + 1}</div>
            <div className="mt-1 aspect-square bg-black/10" />
            <div className="mt-1 h-1 w-full bg-black/20" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

function TintArt() {
  return (
    <Frame paper="#F6F1EA">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="font-serif text-[12px] text-stone-800">
          Tint <em className="text-[#E2432C]">Lab</em>
        </span>
      </div>
      <div className="flex flex-1 gap-2 px-2.5 pb-2.5">
        <div className="flex-1 space-y-2">
          <div className="h-16 rounded-full bg-gradient-to-br from-[#F2C9BF] to-[#F0DCB8]" />
          <div className="h-2 w-3/4 rounded-full bg-stone-300/80" />
          <div className="h-2 w-1/2 rounded-full bg-stone-200" />
        </div>
        <div className="grid w-1/2 grid-cols-2 gap-1.5 content-start">
          {["#F2C9BF", "#D9C2CF", "#C4D9D3", "#EEDAE0"].map((c) => (
            <div
              key={c}
              className="aspect-square rounded-2xl ring-1 ring-black/5"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
    </Frame>
  );
}

function MilkRunArt() {
  return (
    <Frame paper="#FFFCF5" ink="#2B1810">
      <div className="flex items-center justify-between border-b-2 border-[#2B1810] px-3 py-2">
        <span className="text-[12px] font-extrabold tracking-wide">
          MILK <span className="text-[#E8412C]">RUN</span>
        </span>
        <span className="rounded-full bg-[#2B1810] px-2 py-0.5 font-mono text-[8px] text-[#FFFCF5]">
          CART · 2
        </span>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-2 p-2.5">
        {["#2440E0", "#E8412C", "#FFC53D"].map((c, i) => (
          <div key={c} className="relative pt-3">
            <div
              className="absolute inset-x-0 top-0 h-3"
              style={{
                background: c,
                clipPath:
                  "polygon(0 0,8% 50%,16% 0,25% 50%,33% 0,41% 50%,50% 0,58% 50%,66% 0,75% 50%,83% 0,91% 50%,100% 0,100% 100%,0 100%)",
              }}
            />
            <div className="rounded-b-xl border-2 border-t-0 border-[#2B1810] bg-[#FFFCF5] p-1.5 pt-2">
              <div className="aspect-square rounded-md border-2 border-[#2B1810] bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,rgba(43,24,16,0.06)_4px,rgba(43,24,16,0.06)_8px)]" />
              <div className="mt-1.5 h-2 w-4/5 rounded bg-[#2B1810]/80" />
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono text-[8px]">KSh…</span>
                <span className="rounded-full bg-[#2B1810] px-1.5 py-0.5 text-[7px] text-[#FFFCF5]">
                  Add
                </span>
              </div>
            </div>
            {i === 0 ? null : null}
          </div>
        ))}
      </div>
    </Frame>
  );
}

function ComingSoonArt() {
  return (
    <Frame paper="#FBF9F5">
      <div className="flex flex-1 flex-col items-start justify-center gap-2 px-5">
        <div className="h-2 w-16 rounded bg-teal-700/30" />
        <div className="h-4 w-3/4 rounded bg-stone-800/80" />
        <div className="h-2 w-1/2 rounded bg-stone-400/50" />
        <div className="mt-2 h-7 w-24 rounded-full bg-teal-700" />
      </div>
    </Frame>
  );
}

function NeighborhoodArt() {
  return (
    <Frame paper="#FFFBEB">
      <div className="m-3 flex flex-1 flex-col rounded-xl border-2 border-amber-800/30 bg-amber-50 p-3">
        <div className="h-3 w-1/2 rounded bg-amber-900/70" />
        <div className="mt-3 space-y-2">
          <div className="h-2 w-full rounded bg-amber-900/20" />
          <div className="h-2 w-2/3 rounded bg-amber-900/20" />
          <div className="h-2 w-3/4 rounded bg-amber-900/20" />
        </div>
        <div className="mt-auto flex gap-2 pt-3">
          <div className="h-6 flex-1 rounded-full bg-amber-700" />
          <div className="h-6 flex-1 rounded-full border-2 border-amber-800/40" />
        </div>
      </div>
    </Frame>
  );
}

function FreshArt() {
  return (
    <Frame paper="#ECFDF5">
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/40 via-lime-200/50 to-emerald-100" />
        <div className="absolute bottom-0 left-0 right-0 space-y-1.5 bg-white/80 p-3 backdrop-blur-sm">
          <div className="h-3 w-2/3 rounded bg-emerald-900/70" />
          <div className="flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 flex-1 rounded bg-emerald-100" />
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

function ButcheryCutArt() {
  return (
    <Frame paper="#1C1917" ink="#FAFAF9">
      <div className="flex flex-1 flex-col justify-between p-3">
        <div className="h-3 w-1/2 rounded bg-orange-500" />
        <div className="space-y-1.5">
          {["Chuck", "Ribs", "Loin", "Shank"].map((cut) => (
            <div
              key={cut}
              className="flex items-center justify-between border-b border-white/10 py-1 text-[9px]"
            >
              <span>{cut}</span>
              <span className="text-orange-400">Order</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function MinimartHoursArt() {
  return (
    <Frame paper="#F0F9FF">
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <div className="size-8 rounded-full bg-sky-600" />
        <div className="h-3 w-1/2 rounded bg-slate-800/80" />
        <div className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2">
          <div className="font-mono text-[8px] uppercase tracking-widest text-slate-400">
            Hours
          </div>
          <div className="mt-1 text-[11px] font-semibold text-sky-700">
            6:00 – 22:00
          </div>
        </div>
      </div>
    </Frame>
  );
}

function BrandPosterArt() {
  return (
    <Frame paper="#FAFAF9">
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="size-16 rounded-2xl bg-stone-900" />
        <div className="h-2 w-24 rounded bg-stone-400" />
      </div>
    </Frame>
  );
}
