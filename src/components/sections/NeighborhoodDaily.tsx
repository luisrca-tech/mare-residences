import { Section } from "@/components/layout/Section";
import { Container } from "@/components/Container";
import { content } from "@/data/content";

export function NeighborhoodDaily() {
  const daily = content.neighborhood.daily;
  return (
    <Section
      contained={false}
      enable2xlWidthScaling
      data-section="daily"
      aria-labelledby="daily-title"
      className="bg-paper"
    >
      <Container className="flex flex-col gap-9 pt-16 pb-[72px]">
        <p className="type-label">{daily.eyebrow}</p>
        <h2
          id="daily-title"
          data-text="daily.title"
          className="type-h2 max-w-[calc(950px*var(--layout-scale))]"
        >
          {daily.title}
        </h2>
        <div className="grid gap-14 lg:grid-cols-3">
          {daily.items.map((item, index) => (
            <article
              key={item.index}
              aria-labelledby={`daily-${item.index}`}
              className="flex min-w-0 flex-col gap-5"
            >
              <p
                data-text={`daily.index${index}`}
                className="type-nav text-clay"
              >
                {item.index}
              </p>
              <h3
                id={`daily-${item.index}`}
                data-text={`daily.title${index}`}
                className="type-feature-title"
              >
                {item.title}
              </h3>
              <p data-text={`daily.body${index}`} className="type-body">
                {item.body}
              </p>
            </article>
          ))}
        </div>
        <p data-text="daily.disclaimer" className="type-caption text-muted">
          {daily.disclaimer}
        </p>
      </Container>
    </Section>
  );
}
