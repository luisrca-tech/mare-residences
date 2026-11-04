import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { WIDTH_SCALE_CSS_EXPRESSION } from "@/utils/widthScaling";
import localFont from "next/font/local";
import { SiteMotionRoot } from "@/components/motion/SiteMotionRoot";
import { content } from "@/data/content";
import "./globals.css";

const lora = localFont({
  src: "../assets/fonts/Lora-Variable.ttf",
  variable: "--font-lora",
  weight: "400",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
});

const inter = localFont({
  src: "../assets/fonts/Inter-3.19-Regular.woff2",
  variable: "--font-inter",
  weight: "400",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Maré Residences — Seu tempo, seu lugar.",
  description:
    "Arquitetura que acolhe. Espaços para estar, receber e deixar a vida acontecer no seu ritmo.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      style={
        { "--section-width-scale": WIDTH_SCALE_CSS_EXPRESSION } as CSSProperties
      }
      lang="pt-BR"
      className={`${lora.variable} ${inter.variable}`}
    >
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-ivory focus:p-3"
        >
          Ir para o conteúdo
        </a>
        <SiteMotionRoot wordmark={content.shared.brand.wordmark}>
          {children}
        </SiteMotionRoot>
      </body>
    </html>
  );
}
