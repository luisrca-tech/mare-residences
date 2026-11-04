import { Section } from "@/components/layout/Section";
import { Container } from "@/components/Container";
import { ContactForm } from "@/components/ContactForm";
import { content } from "@/data/content";
export function ContactContent() {
  const aside = content.contact.aside;
  return (
    <Section
      contained={false}
      enable2xlWidthScaling
      data-section="contact-content"
      aria-label="Converse com a Maré"
      className="bg-ivory"
    >
      <Container className="grid items-start gap-12 pt-4 pb-20 lg:grid-cols-[minmax(0,508fr)_minmax(0,632fr)] lg:gap-[clamp(48px,calc(29.807692vw-257.230769px),172px)]">
        <aside className="flex min-w-0 flex-col wrap-anywhere gap-6">
          <h2 className="type-contact-aside" data-text="aside.title">
            {aside.title}
          </h2>
          <p className="type-body" data-text="aside.body">
            {aside.body}
          </p>
          <p className="type-body text-clay" data-text="aside.mail">
            {aside.mail}
          </p>
          <p className="type-nav whitespace-pre-line" data-text="aside.hours">
            {aside.hours}
          </p>
          <p className="type-caption text-muted" data-text="aside.note">
            {aside.note}
          </p>
        </aside>
        <ContactForm />
      </Container>
    </Section>
  );
}
