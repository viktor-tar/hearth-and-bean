export default function Loader() {
  return (
    <div data-hb="loader" aria-hidden="true" className="loader">
      <div className="loader__inner">
        <img
          src="/images/hb-logo-colour.webp"
          loading="eager"
          sizes="(max-width: 900px) 100vw, 900px"
          srcSet="/images/hb-logo-colour-p-500.webp 500w, /images/hb-logo-colour-p-800.webp 800w, /images/hb-logo-colour.webp 900w"
          alt=""
          className="loader__logo"
        />
        <div className="loader__track">
          <div data-hb="loader-bar" className="loader__bar" />
        </div>
      </div>
    </div>
  );
}
