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
    case "beauty-edit":
      return <BeautyEditArt />;
    case "scent-story":
      return <ScentStoryArt />;
    case "print-atelier":
      return <PrintAtelierArt />;
    case "blank-drop":
      return <BlankDropArt />;
    case "spirits-cellar":
      return <SpiritsArt />;
    case "oxide":
      return <OxideArt />;
    case "tint-lab":
      return <TintArt />;
    case "milk-run":
      return <MilkRunArt />;
    case "chem-lab":
      return <ChemLabArt />;
    case "carbon-desk":
      return <CarbonDeskArt />;
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
    case "front-window":
      return <FrontWindowArt />;
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
    <Frame paper="#1F1020" ink="#FAF6F0">
      <div className="flex items-center justify-between border-b border-[#C9A227]/30 bg-[#140A14]/80 px-3 py-2">
        <span className="font-serif text-[12px] italic text-[#FAF6F0]">
          Cloud 9 <em className="text-[#DB2777]">stationery</em>
        </span>
        <span className="rounded-full border border-[#C9A227]/60 bg-[#C9A227]/15 px-2 py-0.5 text-[8px] uppercase tracking-wider">
          Tray · 2
        </span>
      </div>
      <div className="grid flex-1 grid-cols-[1.35fr_1fr] gap-2 p-2">
        <div className="relative overflow-hidden border border-[#C9A227]/40 bg-[#2A1528]/80 p-2">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(255,248,235,0.18), transparent 65%)",
            }}
          />
          <div className="text-[7px] uppercase tracking-widest text-[#C9A227]">
            Staff pick
          </div>
          <div className="relative mt-1 aspect-[4/3] border border-[#C9A227]/50 bg-[#FAF6F0]">
            <div className="absolute right-0 top-0 h-5 w-5 bg-gradient-to-bl from-[#F3EBE0] to-transparent" />
          </div>
          <div className="mt-2 flex gap-2">
            <span className="rounded-full border border-[#DB2777]/50 bg-[#DB2777]/15 px-2 py-0.5 text-[8px] text-[#DB2777]">
              KSh…
            </span>
            <span className="rounded-full bg-[#DB2777] px-2 py-0.5 text-[7px] text-[#FAF6F0]">
              Add
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex min-h-0 flex-1 overflow-hidden border border-[#C9A227]/25 bg-[#2A1528]/60"
            >
              <div className="relative w-2/5 border-r border-[#C9A227]/25 bg-[#FAF6F0]">
                <div className="absolute right-0 top-0 h-3 w-3 bg-gradient-to-bl from-[#F3EBE0] to-transparent" />
              </div>
              <div className="flex flex-1 flex-col justify-center gap-1 p-1.5">
                <div className="h-1.5 w-3/4 bg-[#FAF6F0]/60" />
                <div className="h-3 w-10 rounded-full border border-[#DB2777]/40 bg-[#DB2777]/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function BeautyEditArt() {
  return (
    <Frame paper="#FFFFFF" ink="#0E0E0E">
      <div className="bg-[#0E0E0E] px-3 py-1 text-center text-[7px] uppercase tracking-widest text-white/90">
        Free delivery · WhatsApp
      </div>
      <div className="flex items-center justify-between border-b border-[#E8E4DF] px-3 py-2">
        <span className="text-[8px] uppercase tracking-widest text-[#6B6560]">Menu</span>
        <span className="text-[11px] font-medium uppercase tracking-[0.15em]">
          Beyond
        </span>
        <span className="text-[8px] uppercase tracking-widest">Bag · 0</span>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="relative aspect-[3/4] bg-gradient-to-b from-[#2A2A2A] to-[#0E0E0E]"
          >
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <div className="font-serif text-[9px] italic text-white">
                Collection
              </div>
              <div className="text-[6px] uppercase tracking-widest text-[#B5853A]">
                Shop
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-0 border-t border-[#E8E4DF] bg-[#FAFBFB] p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-[#E8E4DF]/60" />
        ))}
      </div>
    </Frame>
  );
}

function ScentStoryArt() {
  return (
    <Frame paper="#FCF8F0" ink="#1A1714">
      <div className="bg-[#C5A04E] px-3 py-1.5 text-center text-[8px] italic tracking-wide text-white">
        New arrivals · Shop Now
      </div>
      <div className="flex items-center justify-between border-b border-[#E8E0D4] px-3 py-2">
        <span className="flex gap-1">
          <span className="h-2.5 w-3 border-t border-[#1A1714]" />
          <span className="size-2.5 rounded-full border border-[#1A1714]" />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#C5A04E]">
          Scent
        </span>
        <span className="size-3 border border-[#1A1714]/70" />
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-end bg-gradient-to-b from-[#4A3F32] via-[#2A241C] to-[#1A1714] px-3 pb-3 pt-6">
        <div className="mb-2 h-1.5 w-24 rounded bg-white/50" />
        <div className="mb-3 h-2.5 w-36 rounded bg-white/80" />
        <div className="bg-white px-4 py-1.5 text-[7px] font-semibold uppercase tracking-widest text-[#C5A04E]">
          Shop Now
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 bg-[#FCF8F0] p-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-[4/5] border border-[#E8E0D4] bg-[#F4EFE6]" />
        ))}
      </div>
    </Frame>
  );
}

function PrintAtelierArt() {
  return (
    <Frame paper="#FFFFFF" ink="#1C1A16">
      <div className="bg-[#C5D0B4] px-3 py-1 text-center text-[7px] tracking-wide text-[#1C1A16]">
        Nairobi · Printed pieces
      </div>
      <div className="flex items-center justify-between border-b border-[#EBE8E2] px-3 py-2">
        <span className="rounded border-2 border-[#2B4A8C] px-1 text-[8px] font-bold text-[#2B4A8C]">
          3D
        </span>
        <span className="flex gap-2 text-[7px] text-[#1C1A16]/80">
          <span>Decor</span>
          <span>Toys</span>
          <span>Gifts</span>
        </span>
        <span className="size-3 rounded-full border border-[#1C1A16]/50" />
      </div>
      <div className="relative flex flex-1 items-center bg-gradient-to-br from-[#E8E4D8] via-[#D9D2C2] to-[#C5D0B4]/40 px-3">
        <div>
          <div className="mb-1 h-2 w-28 rounded bg-[#4A4538]/80" />
          <div className="mb-2 h-1.5 w-24 rounded bg-[#4A4538]/50" />
          <div className="inline-block rounded-full bg-[#4A4538] px-3 py-1 text-[6px] font-semibold uppercase tracking-wider text-white">
            Shop
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 bg-white p-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-[#F4F3EF]" />
        ))}
      </div>
    </Frame>
  );
}

function BlankDropArt() {
  return (
    <Frame paper="#FFFFFF" ink="#000000">
      <div className="flex items-center justify-between px-3 py-2 font-mono">
        <span className="text-[10px] leading-none">+</span>
        <span className="flex gap-3 text-[6px] tracking-[0.14em] text-black/35">
          <span className="text-black">ALL</span>
          <span>ONE</span>
          <span>TWO</span>
        </span>
        <span className="size-2.5 border border-black/70" />
      </div>
      <div className="grid flex-1 grid-cols-6 gap-1.5 bg-white p-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="aspect-square w-full bg-[#F3F3F3]" />
            <div className="h-1 w-6 bg-black/80" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

function SpiritsArt() {
  return (
    <Frame paper="#14100E" ink="#F5EBE0">
      <div className="flex items-center justify-between border-b border-[#3D322A] px-3 py-1.5">
        <span className="font-serif text-[10px] italic text-[#F0E6D8]">
          Cloud 9 <span className="text-[#C4B5FD]">vault</span>
        </span>
        <span className="border border-[#B87333]/60 bg-[#B87333]/15 px-2 py-0.5 text-[7px] uppercase tracking-wider text-[#F0E6D8]">
          Vault · 2
        </span>
      </div>
      <div className="grid flex-1 grid-cols-[1.35fr_1fr] gap-2 p-2">
        <div className="relative border-2 border-[#3D322A] bg-[#1F1814] p-2">
          <div
            className="pointer-events-none absolute -left-1 top-3 size-4 rounded-full bg-[#E8A849]/40 blur-sm"
            aria-hidden
          />
          <div className="font-mono text-[7px] uppercase tracking-widest text-[#E8A849]">
            Grand niche
          </div>
          <div className="relative mt-1 aspect-[4/3] overflow-hidden rounded-t-[40px] border border-[#3D322A] bg-[#2A211C]">
            <div className="absolute bottom-2 right-2 size-4 rounded-full bg-[#8B2635] shadow-md" />
          </div>
          <div className="mt-2 flex gap-2">
            <span className="border border-[#C4B5FD]/40 bg-[#C4B5FD]/10 px-2 py-0.5 text-[8px] text-[#C4B5FD]">
              KSh…
            </span>
            <span className="bg-[#8B2635] px-2 py-0.5 text-[7px] text-[#F0E6D8]">
              Seal
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex min-h-0 flex-1 overflow-hidden border border-[#3D322A] bg-[#1F1814]"
            >
              <div className="relative w-2/5 rounded-tl-[24px] border-r border-[#3D322A] bg-[#2A211C]">
                <div className="absolute bottom-1 right-1 size-2 rounded-full bg-[#8B2635]" />
              </div>
              <div className="flex flex-1 flex-col justify-center gap-1 p-1.5">
                <div className="text-[6px] font-bold uppercase tracking-wider text-[#B87333]">
                  V-00{i + 1}
                </div>
                <div className="h-1.5 w-3/4 bg-[#F0E6D8]/50" />
              </div>
            </div>
          ))}
        </div>
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

function ChemLabArt() {
  return (
    <Frame paper="#0b1116" ink="#EEF3F6">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#84CC16]" aria-hidden />
          <span className="text-[10px] font-bold tracking-tight text-[#EEF3F6]">
            Chem Lab
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="border border-white/15 px-1.5 py-0.5 font-mono text-[6px] uppercase tracking-wider text-[#8AA0AE]">
            Day / Night
          </span>
          <span className="flex items-center gap-1 border border-[#84CC16]/50 bg-[#84CC16]/12 px-1.5 py-0.5 font-mono text-[7px] uppercase text-[#84CC16]">
            Cart
            <span className="bg-[#84CC16] px-1 text-[6px] text-[#0b1116]">2</span>
          </span>
        </span>
      </div>
      <div className="grid flex-1 grid-cols-[1.25fr_1fr] gap-2 p-2">
        <div className="relative grid grid-cols-2 gap-1.5 border border-white/10 bg-[#121920]/95 p-2">
          <div className="absolute left-1 top-1 size-1 rounded-full border border-white/20" />
          <div className="absolute right-1 top-1 size-1 rounded-full border border-white/20" />
          <div className="relative aspect-[4/3] overflow-hidden border border-[#D97706] bg-[#D97706]/15">
            <div className="absolute inset-x-[18%] top-0 h-1.5 bg-[#D97706]" />
            <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-b from-[#D97706]/45 to-[#9A4A0A]/80" />
            <div className="absolute inset-x-2 top-2 h-1.5 bg-white/90" />
          </div>
          <div className="relative flex flex-col justify-end gap-1 pr-1">
            <div className="font-mono text-[5px] uppercase tracking-widest text-[#8AA0AE]">
              Details · SKU
            </div>
            <div className="h-1 w-4/5 bg-[#EEF3F6]/45" />
            <div className="h-1 w-3/5 bg-[#EEF3F6]/30" />
            <div className="mt-1 bg-[#84CC16] px-1.5 py-0.5 font-mono text-[7px] text-[#0b1116]">
              Add
            </div>
            <div className="absolute right-0 top-0 size-5 rotate-[-12deg] rounded-full border border-[#84CC16]/50 font-mono text-[4px] uppercase leading-5 text-center text-[#84CC16]/80">
              ·
            </div>
          </div>
        </div>
        <div className="flex flex-col overflow-hidden border border-white/10 bg-[#121920]/80">
          <div className="flex items-center justify-between border-b border-white/10 px-1.5 py-0.5 font-mono text-[5px] uppercase tracking-wider text-[#8AA0AE]">
            Featured
            <span className="flex gap-0.5">
              <span className="h-0.5 w-1.5 bg-white/25" />
              <span className="h-0.5 w-1.5 bg-white/25" />
            </span>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex min-h-0 flex-1 overflow-hidden border-b border-white/10 last:border-b-0"
            >
              <div className="flex w-3 items-center justify-center border-r border-white/10 font-mono text-[5px] text-[#8AA0AE]">
                V{i + 1}
              </div>
              <div className="relative w-2/5 border-r border-[#D97706]/40 bg-[#D97706]/15">
                <div className="absolute inset-x-[16%] top-0 h-1 bg-[#D97706]" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[#9A4A0A]/70" />
              </div>
              <div className="flex flex-1 flex-col justify-center gap-1 p-1.5">
                <div className="font-mono text-[6px] text-[#D97706]">RX-00{i + 1}</div>
                <div className="h-1.5 w-3/4 bg-[#EEF3F6]/45" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function CarbonDeskArt() {
  return (
    <Frame paper="#C9B896" ink="#2A2218">
      <div className="flex items-center justify-between border-b border-[#A89472] bg-[#F5F0E4] px-3 py-2">
        <span className="font-serif text-[12px] italic text-[#2A2218]">
          Cloud 9 <span className="not-italic text-[#6B5F4F]">· counter</span>
        </span>
        <span className="border border-[#2A2218] bg-[#F5F0E4] px-2 py-0.5 font-mono text-[8px] uppercase">
          Slips · 2
        </span>
      </div>
      <div className="grid flex-1 grid-cols-[1.35fr_1fr] gap-2 p-2">
        <div className="relative border border-[#2A2218] bg-[#F5F0E4] p-2 shadow-[4px_4px_0_rgb(61_107_158/0.35)]">
          <div className="font-mono text-[7px] uppercase tracking-widest text-[#3D6B9E]">
            Duplicate
          </div>
          <div className="mt-1 aspect-[4/3] border border-[#2A2218] bg-[#EBE3D2]" />
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full border-2 border-double border-[#B91C1C] px-2 py-0.5 font-mono text-[8px] text-[#B91C1C]">
              KSh…
            </span>
            <span className="bg-[#B91C1C] px-2 py-0.5 font-mono text-[7px] text-[#F5F0E4]">
              Issue
            </span>
          </div>
          <span className="pointer-events-none absolute bottom-6 right-2 rotate-[-15deg] text-[18px] tracking-widest text-[#3D6B9E]/15">
            DUPLICATE
          </span>
        </div>
        <div className="flex flex-col gap-1.5 pt-3">
          {["-1deg", "0deg", "1.2deg"].map((rot) => (
            <div
              key={rot}
              className="flex min-h-0 flex-1 border border-[#2A2218] bg-[#F5F0E4] shadow-[3px_3px_0_rgb(61_107_158/0.3)]"
              style={{ transform: `rotate(${rot})` }}
            >
              <div className="w-2/5 border-r border-[#2A2218] bg-[#EBE3D2]" />
              <div className="flex flex-1 flex-col justify-center gap-1 p-1.5">
                <div className="h-1.5 w-3/4 bg-[#2A2218]/70" />
                <div className="h-3 w-8 rounded-full border border-[#B91C1C] bg-[#B91C1C]/10" />
              </div>
            </div>
          ))}
        </div>
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

function FrontWindowArt() {
  return (
    <Frame paper="#1A1428" ink="#FAF7F2">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
          <span className="font-serif text-[10px] italic text-[#FAF7F2]">
            Cloud 9
          </span>
          <span className="text-[7px] uppercase tracking-widest text-white/40">
            Visit
          </span>
        </div>
        <div className="relative flex-1 p-2">
          <div className="h-full border-4 border-[#3D2E22] bg-gradient-to-b from-[#2D2240] to-[#1A1428] p-2">
            <div
              className="pointer-events-none absolute inset-4 border border-[#3D2E22]/80"
              style={{
                background:
                  "linear-gradient(90deg, transparent 49.5%, #3D2E22 49.5%, #3D2E22 50.5%, transparent 50.5%), linear-gradient(0deg, transparent 58%, #3D2E22 58%, #3D2E22 60%, transparent 60%)",
              }}
            />
            <div className="relative z-10 flex h-full flex-col justify-end p-2">
              <div className="h-2 w-3/4 rounded bg-[#FAF7F2]/80" />
              <div className="mt-1.5 h-1.5 w-1/2 rounded bg-[#FAF7F2]/40" />
              <div className="mt-2 h-4 w-14 rounded bg-[#0F766E]" />
            </div>
          </div>
        </div>
        <div className="bg-[#FAF7F2] px-3 py-2 text-[#1E1814]">
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-6 rounded-sm bg-[#F0E8DC]" />
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}
