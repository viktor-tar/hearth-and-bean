import { categories, dishesIn } from '@/data/menu';

/** Every dish on /menu, one section per category (data: src/data/menu.ts). */
export default function MenuSections() {
  return (
    <div id="menu-list" className="fullmenu__sections">
      {categories.map((c) => (
        <section key={c.id} id={c.id} className="fullmenu__section">
          <div className="container">
            <div className="fullmenu__grid">
              <div className="fullmenu__head">
                <h2 className="display fullmenu__heading">{c.title}</h2>
              </div>
              <div className="fullmenu__list">
                <div className="hb-list">
                  <div role="list" className="fullmenu__items hb-items">
                    {dishesIn(c.id).map((d) => (
                      <div key={d.name} role="listitem" className="hb-item">
                        <div className="dish">
                          <div className="dish__media">
                            <img
                              src={d.image}
                              loading="lazy"
                              decoding="async"
                              alt=""
                              className="dish__image"
                            />
                          </div>
                          <div className="dish__body">
                            <div className="dish__top">
                              <h3 className="dish__name">{d.name}</h3>
                              <div className="dish__price">{d.price}</div>
                            </div>
                            <p className="dish__text">{d.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
