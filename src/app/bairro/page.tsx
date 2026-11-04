import type { Metadata } from "next";
import { ContactCta } from "@/components/ContactCta";
import { NeighborhoodDaily } from "@/components/sections/NeighborhoodDaily";
import { NeighborhoodHero } from "@/components/sections/NeighborhoodHero";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Bairro — Maré Residences",
  description:
    "A Maré imagina uma vida conectada ao entorno. Um cotidiano feito de pequenas descobertas, dentro e fora de casa.",
};

export default function NeighborhoodPage() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1}>
        <NeighborhoodHero />
        <NeighborhoodDaily />
        <ContactCta />
      </main>
      <SiteFooter />
    </>
  );
}
