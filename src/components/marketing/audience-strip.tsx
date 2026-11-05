/**
 * Right under the hero: Pakto is not only for the five businesses in the picture. Two rows of
 * trades slide in opposite directions (pause on hover, still with reduced motion). The rows are
 * listed twice so the loop has no seam; the copy is hidden from screen readers and the sentence
 * above says the same.
 */
const rowOne = [
  "Фотографи",
  "Майстори",
  "Счетоводители",
  "Рекламни агенции",
  "Автосервизи",
  "Организатори на събития",
  "Уеб студиа",
  "Архитекти",
  "Фризьори и салони",
  "Преводачи",
  "Фирми за почистване",
  "Доставчици",
  "Обучители",
  "Ремонтни екипи",
];
const rowTwo = [
  "Озеленители",
  "Монтажисти",
  "Строителни фирми",
  "Дизайнери на интериор",
  "Видеографи",
  "Кетъринг",
  "Юристи",
  "ИТ поддръжка",
  "Мебелисти",
  "Печатници",
  "Охранителни фирми",
  "Счетоводни кантори",
  "Транспорт и преместване",
  "Всеки, който праща цена",
];

function Row({ items, reverse }: { items: string[]; reverse?: boolean }) {
  return (
    <div className="mf-audience-row" aria-hidden="true">
      <div className="mf-audience-track" data-reverse={reverse}>
        {[...items, ...items].map((item, index) => (
          <span key={index} className="mf-audience-tag">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AudienceStrip() {
  return (
    <section className="px-[6vw] py-20 text-center lg:py-28">
      <p className="mf-kicker justify-center">И НЕ САМО ТЕЗИ</p>
      <h2 className="mx-auto mt-5 max-w-[46rem] text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.04] font-bold tracking-[-0.03em] text-[#102b38]">
        И всички,
        <br />
        <span className="text-[#52707d]">които работят с оферти.</span>
      </h2>
      <p className="mx-auto mt-6 max-w-[34rem] text-lg leading-8 text-[#284955]">
        Фотограф, майстор, счетоводител, агенция, сервиз: щом пращаш цена и
        чакаш „да“, Pakto е за теб.
      </p>
      <div className="mt-10 grid gap-3">
        <Row items={rowOne} />
        <Row items={rowTwo} reverse />
      </div>
    </section>
  );
}
