import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { LiveCollector } from "@/components/LiveCollector";

export const metadata: Metadata = {
  title: "VALUE BET MASTER AI — Prediction Engine 3D",
  description:
    "Plateforme d'aide à la décision sportive : analyse multidimensionnelle, probabilités, value bets. Qualité > Quantité. Aucune garantie de gain.",
  applicationName: "Value Bet Master AI"
};

export const viewport: Viewport = {
  themeColor: "#05060f",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Tahoma est une police système : aucune webfont externe nécessaire */}
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%233d7bff'/%3E%3Cstop offset='1' stop-color='%238b5cf6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='14' fill='%2305060f'/%3E%3Ccircle cx='32' cy='32' r='17' fill='none' stroke='url(%23g)' stroke-width='4'/%3E%3Ccircle cx='32' cy='32' r='6' fill='%2322d3ee'/%3E%3C/svg%3E"
        />
      </head>
      <body>
        <div className="app-bg" aria-hidden />
        <div className="grid-overlay" aria-hidden />
        <Nav />
        <LiveCollector />
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-20 sm:px-6 md:pb-12 md:pt-24">
          {children}
        </main>
        <footer className="mx-auto max-w-[1400px] px-6 pb-32 text-center md:pb-10">
          <p className="text-[11px] leading-relaxed text-slate-500">
            VALUE BET MASTER AI est une plateforme d&apos;aide à la décision basée sur l&apos;analyse statistique,
            probabiliste et comparative des marchés sportifs. Aucun gain n&apos;est garanti — aucune prédiction
            n&apos;est « 100 % sûre ». Jouez de manière responsable.
          </p>
        </footer>
      </body>
    </html>
  );
}
