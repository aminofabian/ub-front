import type { PrintedDish, PrintedMenuOptions, PrintedSection } from "@/lib/printed-menu";

/**
 * The sheet. One structure for every template; the template is a class and the stylesheet does
 * the rest. Rendered inside the preview frame, never in the app's own page.
 */
export function PrintedMenuSheet({ options, sections }: { options: PrintedMenuOptions; sections: PrintedSection[] }) {
  return (
    <div className={`sheet t-${options.template}`}>
      <header className="mast">
        <div>
          <p className="kicker">Menu</p>
          <h1>{options.title.trim() || "Menu"}</h1>
        </div>
        {options.line.trim() ? <p className="tag">{options.line.trim()}</p> : null}
      </header>

      {sections.length === 0 ? (
        <p className="empty">Nothing to print yet. Tick a heading, or add a dish with a price to the menu.</p>
      ) : (
        <main className="body">
          {sections.map((section) => (
            <section key={section.id} className="sec">
              {section.title ? (
                <h2>
                  <span>{section.title}</span>
                </h2>
              ) : null}
              {/* Pictured dishes sit in a grid of their own; a grid that also held the plain rows
                  let a page edge cut through a row. */}
              {section.dishes.some((d) => d.imageUrl) ? (
                <ul className="list pics">
                  {section.dishes.filter((d) => d.imageUrl).map((dish) => (
                    <Dish key={dish.id} dish={dish} />
                  ))}
                </ul>
              ) : null}
              {section.dishes.some((d) => !d.imageUrl) ? (
                <ul className="list rest">
                  {section.dishes.filter((d) => !d.imageUrl).map((dish) => (
                    <Dish key={dish.id} dish={dish} />
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </main>
      )}

      {options.foot.trim() ? <footer className="foot">{options.foot.trim()}</footer> : null}
    </div>
  );
}

function Dish({ dish }: { dish: PrintedDish }) {
  return (
    <li className={`dish ${dish.imageUrl ? "has-pic" : "no-pic"}`}>
      {dish.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- drawn in the print frame, outside Next's image pipeline
        <img className="pic" src={dish.imageUrl} alt="" />
      ) : null}
      <p className="row">
        <span className="name">{dish.name}</span>
        <span className="lead" />
        <span className="price">{dish.price}</span>
      </p>
      {dish.description ? <p className="desc">{dish.description}</p> : null}
    </li>
  );
}
