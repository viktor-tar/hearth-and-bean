/**
 * Decides before the first paint whether the home page moves or stays still: adds hb-js plus hb-motion
 * (or hb-static for reduced motion) to <html>. If the animation code has not started 1.2 s after the
 * page has loaded, it falls back to the still page so nothing stays hidden.
 */
const SNIPPET = `(function(d,w){var c=d.documentElement.classList,r=w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches;c.add('hb-js',r?'hb-static':'hb-motion');w.setTimeout(function(){c.add('hb-loaded')},5000);w.addEventListener('load',function(){w.setTimeout(function(){if(!w.hbReady){c.remove('hb-motion');c.add('hb-static','hb-loaded')}},1200)});})(document,window);`;

export default function HomeMotionMode() {
  return <script dangerouslySetInnerHTML={{ __html: SNIPPET }} />;
}
