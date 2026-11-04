import { SiteHeader } from "@/components/SiteHeader";
import { HomeHero } from "@/components/sections/HomeHero";
import { ResidencesTeaser } from "@/components/sections/ResidencesTeaser";
import { NeighborhoodTeaser } from "@/components/sections/NeighborhoodTeaser";
import { ContactCta } from "@/components/ContactCta";
import { SiteFooter } from "@/components/SiteFooter";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1}>
        <HomeHero />
        <ResidencesTeaser />
        <NeighborhoodTeaser />
        <ContactCta />
      </main>
      <SiteFooter />
    </>
  );
}
