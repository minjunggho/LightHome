import type { ReactNode } from "react";

/* The single instrument-surface primitive. One consistent card vocabulary across
   every screen — variation comes from content and emphasis, not from bespoke
   card styling. */
export function Panel({
  title,
  aside,
  className = "",
  bodyClassName = "",
  children,
}: {
  title?: string;
  aside?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-3xl border border-line bg-surface shadow-card ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 px-6 pt-5">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {aside}
        </header>
      )}
      <div className={`${title ? "px-6 pb-6 pt-3.5" : "p-6"} ${bodyClassName}`}>{children}</div>
    </section>
  );
}
