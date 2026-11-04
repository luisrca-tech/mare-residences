import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PrivacyIntro } from "@/components/sections/PrivacyIntro";
import { PrivacyArticle } from "@/components/sections/PrivacyArticle";

export const metadata: Metadata = {
  title: "Privacidade — Maré Residences",
  description:
    "Documento demonstrativo de privacidade do conceito fictício Maré Residences.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1}>
        <PrivacyIntro />
        <PrivacyArticle />
      </main>
      <SiteFooter />
    </>
  );
}
