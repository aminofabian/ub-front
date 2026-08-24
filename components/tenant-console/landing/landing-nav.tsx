"use client";

import {
  ArrowRight,
  ChevronDown,
  Download,
  Menu,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { PLATFORM_AUDIENCES } from "@/lib/platform-seo-content";
import { cn } from "@/lib/utils";

/* ── Navigation model ─────────────────────────────────────────── */

type MenuLink = {
  label: string;
  body?: string;
  href: string;
  code?: string;
};

type NavMenu = {
  id: string;
  label: string;
  /** Mono department tag shown in the panel header. */
  kicker: string;
  /** Right-aligned mono note in the panel header. */
  headNote?: string;
  /** Full-width grid layout (shop types) instead of labelled columns. */
  grid?: boolean;
  gridLinks?: MenuLink[];
  columns?: { heading: string; links: MenuLink[] }[];
  foot?: { note?: string; links: MenuLink[] };
  width?: "mega" | "plain";
};

const PRODUCT_MENU: NavMenu = {
  id: "product",
  label: "Product",
  kicker: "DEPT 01 · PRODUCT",
  headNote: "4 PILLARS · 1 LEDGER",
  width: "mega",
  columns: [
    {
      heading: "At the counter",
      links: [
        {
          code: "01",
          label: "Point of sale",
          body: "Barcode checkout, M-Pesa, and offline sales.",
          href: "#platform",
        },
        {
          code: "02",
          label: "Inventory",
          body: "One stock count, stock-takes, and transfers.",
          href: "#platform",
        },
        {
          code: "03",
          label: "Analytics",
          body: "Revenue, category, and staff reports.",
          href: "#platform",
        },
      ],
    },
    {
      heading: "Beyond the counter",
      links: [
        {
          code: "04",
          label: "Online storefront",
          body: "A branded shop on the same stock.",
          href: "#platform",
        },
        {
          code: "05",
          label: "Features overview",
          body: "Everything a POS in Kenya needs.",
          href: "#features",
        },
        {
          code: "06",
          label: "How it works",
          body: "Live in three deliberate steps.",
          href: "#how",
        },
      ],
    },
  ],
  foot: {
    note: "Run it on every device",
    links: [
      { label: "Desktop app", href: "/download" },
      { label: "Mobile apps", href: "/download#mobile" },
      { label: "Help center", href: "/help" },
    ],
  },
};

const KENYA_MENU: NavMenu = {
  id: "kenya",
  label: "For Kenya",
  kicker: "DEPT 02 · FOR KENYA",
  headNote: "6 SHOP TYPES",
  width: "mega",
  grid: true,
  gridLinks: PLATFORM_AUDIENCES.map((audience, i) => ({
    code: String(i + 1).padStart(2, "0"),
    label: audience.title,
    body: audience.body,
    href: "#kenya",
  })),
  foot: {
    note: "Trusted by 11 shops across Kenya",
    links: [{ label: "Stories from the floor", href: "#stories" }],
  },
};

const RESOURCES_MENU: NavMenu = {
  id: "resources",
  label: "Resources",
  kicker: "DEPT 03 · RESOURCES",
  headNote: "LEARN & SUPPORT",
  width: "plain",
  columns: [
    {
      heading: "Learn & support",
      links: [
        {
          label: "Guides",
          body: "POS playbooks written for Kenya.",
          href: "#guides",
        },
        { label: "Blog", body: "News, rankings, and how-tos.", href: "/blog" },
        { label: "Stories", body: "From Kenyan shop floors.", href: "#stories" },
        { label: "FAQ", body: "Straight answers, no jargon.", href: "#faq" },
        { label: "Help center", body: "Merchant and shopper docs.", href: "/help" },
      ],
    },
  ],
  foot: {
    note: "Trending",
    links: [
      {
        label: "Top 10 POS systems in Kenya",
        href: "/blog/top-10-pos-systems-kenya-2026",
      },
    ],
  },
};

const MENUS: NavMenu[] = [PRODUCT_MENU, KENYA_MENU, RESOURCES_MENU];

const NAV_TICKET_DOWNLOAD =
  "landing-nav-ticket landing-nav-ticket--ghost landing-nav-ticket--desktop landing-nav-ticket--download";

/* ── Shared panel row ─────────────────────────────────────────── */

function PanelRow({
  link,
  onNavigate,
}: {
  link: MenuLink;
  onNavigate: () => void;
}) {
  return (
    <a href={link.href} className="landing-nav-panel-row" onClick={onNavigate}>
      {link.code ? (
        <span className="landing-nav-panel-code" aria-hidden>
          {link.code}
        </span>
      ) : null}
      <span className="landing-nav-panel-row-text">
        <span className="landing-nav-panel-row-title">{link.label}</span>
        {link.body ? (
          <span className="landing-nav-panel-row-body">{link.body}</span>
        ) : null}
      </span>
      <ArrowRight
        className="landing-nav-panel-row-arrow"
        strokeWidth={2}
        aria-hidden
      />
    </a>
  );
}

function PanelBody({
  menu,
  onNavigate,
}: {
  menu: NavMenu;
  onNavigate: () => void;
}) {
  if (menu.grid && menu.gridLinks) {
    return (
      <div className="landing-nav-panel-body landing-nav-panel-body--grid">
        {menu.gridLinks.map((link) => (
          <PanelRow key={link.label} link={link} onNavigate={onNavigate} />
        ))}
      </div>
    );
  }
  return (
    <div className="landing-nav-panel-body">
      {menu.columns?.map((col) => (
        <div key={col.heading} className="landing-nav-panel-col">
          <p className="landing-nav-panel-col-head">{col.heading}</p>
          {col.links.map((link) => (
            <PanelRow key={link.label} link={link} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Nav ──────────────────────────────────────────────────────── */

type LandingNavProps = {
  onCreateShop: () => void;
  /** Opens the identity pass sheet (same as Sign in). */
  onFindShop: () => void;
  /** Opens the apex identity pass sheet. */
  onSignIn: () => void;
};

export function LandingNav({
  onCreateShop,
  onFindShop,
  onSignIn,
}: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Close the open mega menu on Escape or outside click.
  useEffect(() => {
    if (!openMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    const onPointer = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [openMenu]);

  const closeAll = () => setOpenMenu(null);

  const handleTriggerClick = (
    e: ReactMouseEvent<HTMLButtonElement>,
    id: string,
  ) => {
    const next = openMenu === id ? null : id;
    setOpenMenu(next);
    // Keyboard-initiated opens (detail === 0) move focus into the panel.
    if (next && e.detail === 0) {
      requestAnimationFrame(() => {
        const first = navRef.current
          ?.querySelector(`#landing-panel-${next}`)
          ?.querySelector("a");
        (first as HTMLElement | undefined)?.focus({ preventScroll: true });
      });
    }
  };

  const handlePanelKeyDown = (
    e: ReactKeyboardEvent<HTMLDivElement>,
    id: string,
  ) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const panel = navRef.current?.querySelector(`#landing-panel-${id}`);
    const links = Array.from(panel?.querySelectorAll("a") ?? []) as HTMLElement[];
    if (!links.length) return;
    const current = document.activeElement as HTMLElement | null;
    const idx = current ? links.indexOf(current) : -1;
    const next =
      e.key === "ArrowDown"
        ? (idx + 1) % links.length
        : (idx - 1 + links.length) % links.length;
    links[next]?.focus();
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setOpenGroup(null);
  };

  const toggleGroup = (id: string) =>
    setOpenGroup((prev) => (prev === id ? null : id));

  const handleCreateShop = () => {
    closeMenu();
    onCreateShop();
  };

  const handleSignIn = () => {
    closeMenu();
    onSignIn();
  };

  const drawerGroups = MENUS.map((menu) => ({
    id: menu.id,
    label: menu.label,
    links: [
      ...(menu.gridLinks ?? []),
      ...(menu.columns?.flatMap((col) => col.links) ?? []),
      ...(menu.foot?.links ?? []),
    ],
  }));

  return (
    <>
      <nav
        ref={navRef}
        className={cn(
          "landing-nav landing-nav--app sticky top-0 z-50 transition-colors duration-300",
          scrolled || menuOpen || openMenu
            ? "landing-nav--solid"
            : "landing-nav--clear",
        )}
      >
        <div className="landing-nav-inner">
          <div className="landing-nav-brand">
            <KioskLogo
              href="/"
              size="sm"
              variant="landing"
              plain
              className="landing-nav-logo landing-nav-logo--mobile md:hidden"
            />
            <KioskLogo
              href="/"
              size="lg"
              variant="landing"
              plain
              className="landing-nav-logo landing-nav-logo--desktop hidden md:inline-flex"
            />
          </div>

          <div className="landing-nav-center hidden md:flex">
            <div className="landing-nav-links" aria-label="Primary">
              {MENUS.map((menu) => (
                <button
                  key={menu.id}
                  type="button"
                  className={cn(
                    "landing-nav-link",
                    openMenu === menu.id && "is-open",
                  )}
                  aria-expanded={openMenu === menu.id}
                  aria-controls={`landing-panel-${menu.id}`}
                  aria-haspopup="true"
                  onClick={(e) => handleTriggerClick(e, menu.id)}
                >
                  <span className="landing-nav-link-label">{menu.label}</span>
                  <ChevronDown
                    className="landing-nav-link-chevron"
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>
              ))}
              <a href="#pricing" className="landing-nav-link">
                <span className="landing-nav-link-label">Pricing</span>
              </a>
            </div>

            {MENUS.map((menu) => (
              <div
                key={menu.id}
                id={`landing-panel-${menu.id}`}
                role="region"
                aria-label={`${menu.label} submenu`}
                className={cn(
                  "landing-nav-panel",
                  menu.width === "plain" && "landing-nav-panel--plain",
                  openMenu === menu.id ? "is-open" : "is-closed",
                )}
                aria-hidden={openMenu !== menu.id}
                onKeyDown={(e) => handlePanelKeyDown(e, menu.id)}
              >
                <div className="landing-nav-panel-card">
                  <div className="landing-nav-panel-head">
                    <span className="landing-nav-panel-kicker">
                      {menu.kicker}
                    </span>
                    {menu.headNote ? (
                      <span className="landing-nav-panel-note" aria-hidden>
                        {menu.headNote}
                      </span>
                    ) : null}
                  </div>
                  <PanelBody menu={menu} onNavigate={closeAll} />
                  {menu.foot ? (
                    <div className="landing-nav-panel-foot">
                      {menu.foot.note ? (
                        <span className="landing-nav-panel-foot-note">
                          {menu.foot.note}
                        </span>
                      ) : null}
                      <span className="landing-nav-panel-foot-links">
                        {menu.foot.links.map((link) => (
                          <a
                            key={link.label}
                            href={link.href}
                            className="landing-nav-panel-foot-link"
                            onClick={closeAll}
                          >
                            {link.label}
                          </a>
                        ))}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="landing-nav-actions">
            <div className="landing-nav-capsule md:hidden" role="group">
              <button
                type="button"
                className="landing-nav-capsule-btn"
                onClick={onFindShop}
                aria-label="Find shop"
              >
                <Search className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
              <span className="landing-nav-capsule-rule" aria-hidden />
              <button
                type="button"
                className="landing-nav-capsule-btn landing-nav-capsule-btn--menu"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="landing-mobile-menu"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
              >
                {menuOpen ? (
                  <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                ) : (
                  <Menu className="h-4 w-4" strokeWidth={2} aria-hidden />
                )}
              </button>
            </div>

            <button
              type="button"
              className="landing-nav-ticket landing-nav-ticket--ghost landing-nav-ticket--desktop"
              onClick={onSignIn}
            >
              Sign in
            </button>
            <Link
              href="/download"
              className={NAV_TICKET_DOWNLOAD}
              aria-label="Download desktop app"
            >
              <Download
                className="h-3.5 w-3.5 text-[var(--kiosk-gold)]"
                strokeWidth={2}
                aria-hidden
              />
              Download
            </Link>
            <button
              type="button"
              className="landing-nav-ticket landing-nav-ticket--primary landing-nav-ticket--desktop"
              onClick={onCreateShop}
            >
              Start free
            </button>
          </div>
        </div>
      </nav>

      <div
        id="landing-mobile-menu"
        className={cn(
          "landing-nav-drawer md:hidden",
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="landing-nav-drawer-inner">
          <nav className="flex flex-col" aria-label="Mobile">
            {drawerGroups.map((group) => {
              const isGroupOpen = openGroup === group.id;
              return (
                <div key={group.id} className="landing-nav-drawer-group">
                  <button
                    type="button"
                    className="landing-nav-drawer-toggle"
                    aria-expanded={isGroupOpen}
                    aria-controls={`landing-drawer-sub-${group.id}`}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={cn(
                        "landing-nav-drawer-chevron",
                        isGroupOpen && "is-open",
                      )}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </button>
                  <div
                    id={`landing-drawer-sub-${group.id}`}
                    className={cn(
                      "landing-nav-drawer-sub",
                      isGroupOpen && "is-open",
                    )}
                  >
                    <div className="landing-nav-drawer-sub-inner">
                      {group.links.map((link, i) => (
                        <a
                          key={link.label}
                          href={link.href}
                          className="landing-nav-drawer-sublink"
                          style={{ "--i": i } as CSSProperties}
                          onClick={closeMenu}
                        >
                          {link.code ? (
                            <span
                              className="landing-nav-drawer-code"
                              aria-hidden
                            >
                              {link.code}
                            </span>
                          ) : null}
                          <span className="landing-nav-drawer-subtext">
                            <span className="landing-nav-drawer-sublabel">
                              {link.label}
                            </span>
                            {link.body ? (
                              <span className="landing-nav-drawer-subbody">
                                {link.body}
                              </span>
                            ) : null}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            <a
              href="#pricing"
              className="landing-nav-drawer-link"
              onClick={closeMenu}
            >
              <span>Pricing</span>
            </a>
          </nav>

          <div className="mt-auto flex flex-col gap-3 border-t border-[var(--kiosk-border-soft)] pt-6">
            <button
              type="button"
              className="landing-nav-sheet-btn landing-nav-sheet-btn--ghost"
              onClick={handleSignIn}
            >
              Sign in
            </button>
            <Link
              href="/download"
              className="landing-nav-sheet-btn landing-nav-sheet-btn--ghost"
              onClick={closeMenu}
            >
              <Download
                className="h-4 w-4 text-[var(--kiosk-gold)]"
                strokeWidth={2}
                aria-hidden
              />
              Download desktop app
            </Link>
            <button
              type="button"
              className="landing-nav-sheet-btn landing-nav-sheet-btn--primary"
              onClick={handleCreateShop}
            >
              Start free
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
