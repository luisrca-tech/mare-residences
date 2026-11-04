import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ContactIntro } from "@/components/sections/ContactIntro";
import { ContactContent } from "@/components/sections/ContactContent";
export const metadata: Metadata = {
  title: "Contato — Maré Residences",
  description: "Toda mudança começa com uma conversa. Conheça o conceito Maré.",
};
export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1}>
        <ContactIntro />
        <ContactContent />
      </main>
      <SiteFooter />
    </>
  );
}
