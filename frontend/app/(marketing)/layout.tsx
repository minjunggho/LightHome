import { Manrope, Newsreader } from "next/font/google";

import "./landing-theme.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

/**
 * Layout for the public landing page ("/").
 *
 * Lives in the (marketing) route group so its theme — the redesign's
 * landing-theme.css plus the Manrope/Newsreader faces — is bundled for this
 * route only. The dashboard routes stay outside the group and keep the
 * "soft watch" theme from app/globals.css; the two never collide.
 */
export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${manrope.variable} ${newsreader.variable} lh-landing-root`}>
      {children}
    </div>
  );
}
