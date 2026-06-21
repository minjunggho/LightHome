"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/dashboard", label: "Home", icon: GridIcon },
  { href: "/parent", label: "Watch console", icon: PulseIcon },
  { href: "/platform", label: "Trust & Safety", icon: ShieldIcon },
];

export function AppShell({
  title,
  subtitle,
  actions,
  aside,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-screen w-full bg-surface">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-line px-5 py-7 lg:flex">
          <Link href="/dashboard" className="flex items-center gap-2.5 px-1">
            <Beacon />
            <span className="flex flex-col leading-none">
              <span className="text-[1.3rem] font-bold tracking-tight text-ink">Lighthome</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                First 45 · grooming watch
              </span>
            </span>
          </Link>

          <nav className="mt-10 flex flex-col gap-1">
            {NAV.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors duration-150 ${
                    active
                      ? "bg-surface-2 font-semibold text-ink"
                      : "text-ink-3 hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <Icon
                    className={`h-[19px] w-[19px] transition-colors ${
                      active ? "text-brand-ink" : "text-ink-3 group-hover:text-ink"
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Reassurance card (echoes the reference's promo-card slot) */}
          <div className="mt-auto rounded-2xl bg-surface-2 p-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="lh-blip inline-flex h-2 w-2 rounded-full bg-[oklch(0.66_0.11_168)]" />
              </span>
              <span className="text-[12px] font-semibold text-ink">Human in the loop</span>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
              Lighthome never blocks, bans, or reports on its own. Demo conversations are
              fictional and clearly labeled.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-1 border-t border-line pt-4">
            <FootLink icon={InfoIcon} label="Help & information" />
            <FootLink icon={LogoutIcon} label="Log out" />
          </div>
        </aside>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-5 py-7 sm:px-8 lg:px-10 xl:px-12">
            {/* Mobile brand row */}
            <div className="mb-6 flex items-center gap-2.5 lg:hidden">
              <Beacon />
              <span className="text-lg font-bold tracking-tight text-ink">Lighthome</span>
            </div>

            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-[1.85rem] font-bold tracking-tight text-ink sm:text-[2.15rem]">
                  {title}
                </h1>
                {subtitle && <p className="mt-1.5 text-[15px] text-ink-2">{subtitle}</p>}
              </div>
              {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
            </header>

            <div className="my-7 border-t border-line" />

            {children}
          </main>
        </div>

        {/* Optional right rail */}
        {aside && (
          <aside className="sticky top-0 hidden h-screen w-[348px] shrink-0 flex-col border-l border-line xl:flex">
            {aside}
          </aside>
        )}
    </div>
  );
}

function FootLink({
  icon: Icon,
  label,
}: {
  icon: (p: { className?: string }) => ReactNode;
  label: string;
}) {
  return (
    <button className="flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink">
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </button>
  );
}

/* Brand mark — a lighthouse beam in a blue tile. */
function Beacon() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3.2 14 12H10z" fill="oklch(0.86 0.12 86)" />
        <path d="M9.4 12h5.2l1 8.6H8.4z" fill="white" />
        <path d="M9 16h6" stroke="oklch(0.5 0.16 257)" strokeWidth="1.3" />
        <path
          d="M14.8 6.4 19 5M14.8 9 19 9"
          stroke="oklch(0.86 0.12 86)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}
function PulseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2.5-6 5 12 2.5-6H21" />
    </svg>
  );
}
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V6z" />
    </svg>
  );
}
function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}
function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
