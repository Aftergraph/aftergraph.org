import React from "react";
import "./Home.css";

// Atlas Home: landing view for the evidence-aware dev observatory.
// Structure: focal living-map teaser, evidence-trace motif, entry points
// to topology / drift / ask. No invented numbers, no fake stats.

const ENTRIES = [
  {
    id: "topology",
    title: "Topology",
    body: "The shape of the system: services, claims, and the evidence that links them.",
    action: "Open topology",
  },
  {
    id: "drift",
    title: "Drift",
    body: "Where live behavior departs from the record, ordered by signal.",
    action: "Follow the drift",
  },
  {
    id: "ask",
    title: "Ask",
    body: "Put a question to the map. Answers arrive with the trace that produced them.",
    action: "Ask Atlas",
  },
];

export default function Home({ onNavigate }) {
  const go = (view) => {
    if (typeof onNavigate === "function") onNavigate(view);
    else {
      const p = new URLSearchParams(window.location.search);
      p.set("view", view);
      window.history.replaceState(null, "", "?" + p.toString());
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <section className="ag-home">
      <header className="ag-home-masthead">
        <p className="ag-home-eyebrow">Aftergraph Atlas</p>
        <h1 className="ag-home-title">
          A living map of your system&rsquo;s evidence.
        </h1>
        <p className="ag-home-sub">
          Atlas renders how your software actually behaves and ties every claim
          to the evidence behind it. When reality drifts from the record, you
          see where it happens, and you can trace why.
        </p>
        <div className="ag-home-cta">
          <button
            type="button"
            className="ag-home-btn ag-home-btn-primary"
            onClick={() => go("topology")}
          >
            Open the map
          </button>
          <button
            type="button"
            className="ag-home-btn"
            onClick={() => go("ask")}
          >
            Ask Atlas
          </button>
        </div>
      </header>

      <figure className="ag-home-map">
        <svg viewBox="0 0 640 400" aria-hidden="true" focusable="false">
          {/* field edges: the quiet structure of the map */}
          <g className="ag-home-edges">
            <path d="M120 300 L260 210" />
            <path d="M260 210 L180 90" />
            <path d="M260 210 L420 140" />
            <path d="M260 210 L480 320" />
            <path d="M480 320 L540 260" />
          </g>

          {/* evidence trace: the single animated motif, claim to evidence */}
          <path
            className="ag-home-trace"
            d="M260 210 C 330 150 360 140 420 140 S 525 200 540 260"
          />

          <g className="ag-home-nodes">
            <circle cx="120" cy="300" r="7" />
            <circle cx="180" cy="90" r="5" />
            <circle cx="260" cy="210" r="9" />
            <circle cx="420" cy="140" r="7" />
            <circle cx="480" cy="320" r="5" />
            <circle cx="540" cy="260" r="7" />
          </g>

          <g className="ag-home-labels">
            <text x="260" y="240">run</text>
            <text x="420" y="122">claim</text>
            <text x="540" y="290">evidence</text>
          </g>
        </svg>
        <figcaption className="ag-home-caption">
          A living map. Each trace connects a claim to the evidence that
          supports it.
        </figcaption>
      </figure>

      <nav className="ag-home-entries" aria-label="Atlas views">
        {ENTRIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="ag-home-entry"
            onClick={() => go(entry.id)}
          >
            <span className="ag-home-entry-kicker">{entry.title}</span>
            <span className="ag-home-entry-body">{entry.body}</span>
            <span className="ag-home-entry-action">{entry.action} &rarr;</span>
          </button>
        ))}
      </nav>
    </section>
  );
}
