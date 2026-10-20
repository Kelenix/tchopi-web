import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import { DialogHost } from "@/components/dialog";
import { env } from "@/lib/env";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
// Titres éditoriaux de la page d'accueil.
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: "Tchopi : vos restaurants préférés, livrés chez vous", template: "%s · Tchopi" },
  description:
    "Commandez dans les restaurants et maquis de votre ville en Côte d'Ivoire, payez en espèces, Mobile Money ou carte, et suivez votre livreur en direct.",
  openGraph: { siteName: "Tchopi", locale: "fr_CI", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0c110e" },
  ],
};

// Thème choisi (cookie) ou celui du système, appliqué avant l'affichage : aucun flash au chargement.
const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(light|dark)/);var t=m?m[1]:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" data-theme="light" suppressHydrationWarning className={`${jakarta.variable} ${serif.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <DialogHost />
      </body>
    </html>
  );
}
