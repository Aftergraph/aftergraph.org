import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import "./Home.css";

const PRODUCTS = [
  {
    id: "studio",
    title: "Studio by Aftergraph",
    badge: "prototype",
    body: "Generelt operativmiljø for styrt agentarbejde. Chat, styr missioner, godkend handlinger, inspicer evidence.",
    pipeline: "Mål → Fremdrift → Behøver dig → Verificeret udfald",
  },
  {
    id: "wie",
    title: "Wie by Aftergraph",
    badge: "prototype",
    body: "Work Intelligence Engine. Kildeneutrale observationer bliver til strukturerede, attribuerbare WorkItems klar til gennemsyn.",
    pipeline: "Signal → Observation → WorkItem → Gennemsyn → Publicér",
  },
  {
    id: "sentinel",
    title: "Sentinel by Aftergraph",
    badge: "prototype",
    body: "Verificeret kodegennemsyn. PR’er evalueres mod præcis HEAD med evidence-baserede SHIP / DO NOT SHIP-kendelser.",
    pipeline: "Præcis HEAD → Tjek → Evidence → Kendelse",
  },
];

const PRINCIPLES = [
  {
    title: "Agent siger færdig ≠ verificeret udfald",
    body: "Afsluttet arbejde kræver stadig uafhængig kontrol. Aftergraph adskiller selvvurdering fra bevis på hvert lag.",
  },
  {
    title: "Evidence før tillid",
    body: "Ingen antagelser uden inspicérbare artefakter. Hvert claim binder sig til sit evidence, ikke til en persons ord.",
  },
  {
    title: "Begrænset autoritet",
    body: "Agenter handler inden for et defineret mandat. Overskridelser stoppes automatisk og spores tilbage til kilden.",
  },
  {
    title: "Holdbar eksekvering",
    body: "Arbejde overlever genstart, netværksbrud og fejl. Runtime garanterer at intentionen gennemføres eller fejler synligt.",
  },
];

const TIMELINE = [
  { year: "2024", label: "Grundlagt", body: "Aftergraph stiftes med fokus på verificerbare autonome systemer." },
  { year: "2025 Q1", label: "Første prototype", body: "Studio og Wie når prototype-stadie; interne tests begynder." },
  { year: "2025 Q3", label: "Sentinel lanceres", body: "Kodegennemsyn med evidence-baserede kendelser åbnes for partnere." },
  { year: "2026", label: "Atlas offentlig", body: "Atlas viser systemets topologi, drift og evidence i ét kort." },
];

const CODE_EXAMPLES = [
  {
    lang: "curl",
    code: `curl -s https://aftergraph.org/healthz\n# {"status":"ok","sha":"66b29af",...}\ngit ls-remote https://github.com/Aftergraph/aftergraph.org HEAD\n# SHA’er skal matche — live kode er lig med reviewet kode`,
  },
  {
    lang: "JavaScript",
    code: `const live = await fetch('https://aftergraph.org/healthz')\n  .then(r => r.json());\nconsole.log(live.status, live.sha); // ok 66b29af`,
  },
];

export default function Home({ onNavigate }) {
  const shouldReduceMotion = useReducedMotion();

  const go = (view) => {
    if (typeof onNavigate === "function") onNavigate(view);
    else {
      const p = new URLSearchParams(window.location.search);
      p.set("view", view);
      window.history.replaceState(null, "", "?" + p.toString());
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const fadeUp = shouldReduceMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  const sectionTransition = (delay = 0) => ({
    duration: shouldReduceMotion ? 0 : 0.6,
    delay: shouldReduceMotion ? 0 : delay,
    ease: [0.16, 1, 0.3, 1],
  });

  return (
    <div className="ag-home-wrap">
      <main className="ag-home">
        {/* ── Hero ── */}
        <motion.section
          className="ag-section ag-hero"
          {...fadeUp}
          transition={sectionTransition()}
        >
          <span className="ag-eyebrow">Atlas — dit overblik over Aftergraph</span>
          <h1 className="ag-display" style={{ fontSize: '70px', letterSpacing: '-2.8px', fontWeight: 600, lineHeight: 1.05 }}>
            Byg autonome systemer der kan bevise deres arbejde
          </h1>
          <p className="ag-body-lg">
            Atlas forbinder intelligent arbejde med begrænset autoritet, holdbar
            eksekvering, evidence og uafhængig verifikation. Brug styrede agenter.
            Verificér hvert udfald.
          </p>
          <div className="ag-hero-actions">
            <button
              type="button"
              className="ag-btn ag-btn-primary"
              onClick={() => go("topology")}
            >
              Åbn kortet
            </button>
            <button
              type="button"
              className="ag-btn"
              onClick={() => go("ask")}
            >
              Spørg Atlas
            </button>
          </div>
        </motion.section>

        {/* ── Code blocks ── */}
        <motion.section
          className="ag-section ag-code-section"
          {...fadeUp}
          transition={sectionTransition(0.1)}
        >
          <span className="ag-eyebrow">Verificér hvad der er live — lige nu</span>
          <h2 className="ag-headline">
            Ingen tilmelding, ingen nøgle. Siden beviser hvilken kode den kører.
          </h2>
          <div className="ag-code-grid">
            {CODE_EXAMPLES.map((block) => (
              <div key={block.lang} className="ag-code-block">
                <span className="ag-code-lang">{block.lang}</span>
                <pre className="ag-code-pre">
                  <code>{block.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Product cards ── */}
        <motion.section
          className="ag-section"
          {...fadeUp}
          transition={sectionTransition(0.15)}
        >
          <span className="ag-eyebrow">Tre overflader. Ærlig modenhed.</span>
          <h2 className="ag-headline">
            Hvert produkt viser hvad det gør, hvordan det virker, og hvor det står.
          </h2>
          <div className="ag-product-grid">
            {PRODUCTS.map((product) => (
              <article key={product.id} className="ag-product-card">
                <header className="ag-product-header">
                  <h3 className="ag-product-title">{product.title}</h3>
                  <span className="ag-badge">{product.badge}</span>
                </header>
                <p className="ag-product-body">{product.body}</p>
                <p className="ag-product-pipeline">{product.pipeline}</p>
              </article>
            ))}
          </div>
        </motion.section>

        {/* ── Principles ── */}
        <motion.section
          className="ag-section"
          {...fadeUp}
          transition={sectionTransition(0.2)}
        >
          <span className="ag-eyebrow">Fuldført er ikke verificeret</span>
          <h2 className="ag-headline">
            Systemet er designet omkring holdbare principper i stedet for
            tillidsteater.
          </h2>
          <div className="ag-principle-grid">
            {PRINCIPLES.map((item) => (
              <div key={item.title} className="ag-principle-card">
                <h3 className="ag-principle-title">{item.title}</h3>
                <p className="ag-principle-body">{item.body}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Timeline ── */}
        <motion.section
          className="ag-section ag-timeline-section"
          {...fadeUp}
          transition={sectionTransition(0.25)}
        >
          <span className="ag-eyebrow">Historik</span>
          <h2 className="ag-headline">Fra grundlæggelse til offentligt kort</h2>
          <ol className="ag-timeline">
            {TIMELINE.map((entry) => (
              <li key={entry.year} className="ag-timeline-item">
                <span className="ag-timeline-year">{entry.year}</span>
                <div className="ag-timeline-content">
                  <strong className="ag-timeline-label">{entry.label}</strong>
                  <p className="ag-timeline-body">{entry.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>

        {/* ── CTA footer ── */}
        <motion.section
          className="ag-section ag-cta-footer"
          {...fadeUp}
          transition={sectionTransition(0.3)}
        >
          <h2 className="ag-headline">Klar til at se dit systems sandhed?</h2>
          <p className="ag-body-lg">
            Atlas samler topologi, drift og evidence i ét levende kort. Start
            med at udforske eller stil spørgsmål direkte.
          </p>
          <div className="ag-hero-actions">
            <button
              type="button"
              className="ag-btn ag-btn-primary"
              onClick={() => go("topology")}
            >
              Åbn kortet
            </button>
            <button
              type="button"
              className="ag-btn"
              onClick={() => go("drift")}
            >
              Se drift
            </button>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
