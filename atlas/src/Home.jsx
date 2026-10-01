import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import "./Home.css";

const PRODUCTS = [
  {
    id: "studio",
    title: "Studio by Aftergraph",
    badge: "demo",
    body: "General-purpose operating environment for governed agent work: missions, approvals, evidence and outcome inspection.",
    pipeline: "Goal → Progress → Needs You → Verified Outcome",
  },
  {
    id: "wie",
    title: "Wie by Aftergraph",
    badge: "prototype",
    body: "Work Intelligence Engine. Source-neutral observations become structured, attributable WorkItems ready for review.",
    pipeline: "Signal → Observation → WorkItem → Review → Publish",
  },
  {
    id: "sentinel",
    title: "Sentinel by Aftergraph",
    badge: "prototype",
    body: "Exact-HEAD software review with evidence-backed verification findings and verdicts.",
    pipeline: "Exact HEAD → Checks → Evidence → Verdict",
  },
  {
    id: "atlas",
    title: "Atlas by Aftergraph",
    badge: "production",
    body: "Evidence-aware development observatory for topology, truth planes, drift, snapshots and cited assertions.",
    pipeline: "Canonical + Observed + Proposed → Evidence → Drift",
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

const CODE_EXAMPLES = [
  {
    lang: "curl",
    code: `curl -s https://aftergraph.org/healthz\ncurl -s https://aftergraph.org/provenance.json\n# Verify status, sha, route and deployed agree across both contracts.`,
  },
  {
    lang: "JavaScript",
    code: `const [health, provenance] = await Promise.all([\n  fetch('/healthz').then(r => r.json()),\n  fetch('/provenance.json').then(r => r.json())\n]);\nconst verified = health.status === 'ok' && health.sha === provenance.sha;`,
  },
];

export default function Home({ onNavigate }) {
  const shouldReduceMotion = useReducedMotion();
  const [truthCuts, setTruthCuts] = useState({
    canonical: null,
    observed: null,
    canonicalRepos: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/platform/catalog.json', { cache: 'no-store' }).then((r) => {
        if (!r.ok) throw new Error('platform catalog unavailable');
        return r.json();
      }),
      fetch('/atlas/projection.json', { cache: 'no-store' }).then((r) => {
        if (!r.ok) throw new Error('Atlas projection unavailable');
        return r.json();
      }),
    ]).then(([catalog, projection]) => {
      if (cancelled) return;
      setTruthCuts({
        canonical: catalog?.source?.evidence_cut ?? null,
        observed: projection?.meta?.evidence_cut ?? null,
        canonicalRepos: catalog?.counts?.canonical ?? null,
        loading: false,
      });
    }).catch(() => {
      if (!cancelled) setTruthCuts((current) => ({ ...current, loading: false }));
    });
    return () => { cancelled = true; };
  }, []);

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
          <span className="ag-eyebrow">Atlas — evidence-aware system observatory</span>
          <h1 className="ag-display" style={{ fontSize: '70px', letterSpacing: '-2.8px', fontWeight: 600, lineHeight: 1.05 }}>
            Inspect the system before you trust the claim
          </h1>
          <p className="ag-body-lg">
            Atlas separates canonical system truth from observed evidence, proposed change and verification. Inspect provenance, topology and drift without collapsing one truth plane into another.
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
          <div className="ag-cut-grid" aria-label="Atlas truth cuts">
            <div className="ag-cut-card">
              <span>Latest canonical topology</span>
              <strong>{truthCuts.canonical || (truthCuts.loading ? 'loading…' : 'unavailable')}</strong>
              <small>{truthCuts.canonicalRepos ? `${truthCuts.canonicalRepos} canonical repositories` : 'Governance-derived catalog'}</small>
            </div>
            <div className="ag-cut-card">
              <span>Observed evidence snapshot</span>
              <strong>{truthCuts.observed || (truthCuts.loading ? 'loading…' : 'unavailable')}</strong>
              <small>Historical GitHub observation cut; not silently promoted to the canonical cut.</small>
            </div>
          </div>
        </motion.section>

        {/* ── Code blocks ── */}
        <motion.section
          className="ag-section ag-code-section"
          {...fadeUp}
          transition={sectionTransition(0.1)}
        >
          <span className="ag-eyebrow">Verify what is live — without a hardcoded SHA</span>
          <h2 className="ag-headline">
            The public health and provenance contracts expose the deployed source identity. Cross-check them instead of trusting a badge.
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
          <span className="ag-eyebrow">Four public entry surfaces. Honest maturity.</span>
          <h2 className="ag-headline">
            The entry surfaces are only part of the system. Governance currently tracks a broader canonical portfolio; maturity is not inferred from topology membership.
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

        {/* ── Canonical portfolio ── */}
        <motion.section
          className="ag-section ag-timeline-section"
          {...fadeUp}
          transition={sectionTransition(0.25)}
        >
          <span className="ag-eyebrow">Canonical system portfolio</span>
          <h2 className="ag-headline">The front door is not the whole platform.</h2>
          <p className="ag-body-lg">
            FIHIM, RenOS, Runtime, CORE / ToolFabric, Skill ABI, Cron Fabric and other systems
            participate in the current Governance topology. Visibility, lifecycle and maturity
            remain separate claims.
          </p>
          <div className="ag-hero-actions">
            <a className="ag-btn ag-btn-primary" href="/platform/catalog.json">Open platform catalog</a>
            <button type="button" className="ag-btn" onClick={() => go("topology")}>Inspect topology snapshot</button>
          </div>
        </motion.section>

        {/* ── CTA footer ── */}
        <motion.section
          className="ag-section ag-cta-footer"
          {...fadeUp}
          transition={sectionTransition(0.3)}
        >
          <h2 className="ag-headline">Inspect the evidence planes.</h2>
          <p className="ag-body-lg">
            Use Atlas for evidence-aware exploration, and use the Governance-derived platform catalog when you need the latest canonical repository topology.
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
