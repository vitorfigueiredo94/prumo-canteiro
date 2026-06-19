import type { Metadata } from "next";
import { Spectral, Manrope } from "next/font/google";
import "./globals.css";

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PrumoCanteiro",
    template: "%s — PrumoCanteiro",
  },
  description: "Gestão de obras, terrenos, funcionários e finanças para construtoras.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${spectral.variable} ${manrope.variable} h-full`}
    >
      <head>
        {/* Aplica data-theme antes do primeiro paint para evitar flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('prumocanteiro:theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e3a5f" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PrumoCanteiro" />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
