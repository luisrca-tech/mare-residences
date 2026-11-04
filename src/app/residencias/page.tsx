import type { Metadata } from "next";
import { ContactCta } from "@/components/ContactCta";
import { ResidenceDetails } from "@/components/sections/ResidenceDetails";
import { ResidenceLayouts } from "@/components/sections/ResidenceLayouts";
import { ResidencesHero } from "@/components/sections/ResidencesHero";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Residências — Maré Residences",
  description:
    "Um começo tranquilo, uma casa cheia de encontros. Descubra duas maneiras de habitar a Maré.",
};

export default function ResidencesPage() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1}>
        <ResidencesHero />
        <ResidenceLayouts />
        <ResidenceDetails />
        <ContactCta />
      </main>
      <SiteFooter />
    </>
  );
}
