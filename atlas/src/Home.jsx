import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import "./Home.css";

const FEATURES = [
  {
    id: "topology",
    title: "Topology",
    body: "The shape of the system: services, claims, and the evidence that links them.",
    action: "Open topology",
    icon: "◎",
  },
  {
    id: "drift",
    title: "Drift",
    body: "Where live behavior departs from the record, ordered by signal strength.",
    action: "Follow the drift",
    icon: "↯",
  },
  {
    id: "ask",
    title: "Ask",
    body: "Put a question to the map. Answers arrive with the trace that produced them.",
    action: "Ask Atlas",
    icon: "?",
  },
];

const QUICK_LINKS = [
  { id: "research", label: "Research" },
  { id: "contracts", label: "Contracts" },
  { id: "capabilities", label: "Capabilities" },
  { id: "snapshots", label: "Snapshots" },
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
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  return (
    <section className="ag-home">
      {/* Hero */}
      <motion.header
        className="ag-home-hero"
        {...fadeUp}
        transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="ag-home-eyebrow">Aftergraph Atlas V3</p>
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
      </motion.header>

      {/* Living map teaser SVG */}
      <motion.figure
        className="ag-home-map"
        {...fadeUp}
        transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: shouldReduceMotion ? 0 : 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg viewBox="0 0 640 400" aria-hidden="true" focusable="false">
          <g className="ag-home-edges">
            <path d="M120 300 L260 210" />
            <path d="M260 210 L180 90" />
            <path d="M260 210 L420 140" />
            <path d="M260 210 L480 320" />
            <path d="M480 320 L540 260" />
          </g>
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
      </motion.figure>

      {/* Feature cards */}
      <nav className="ag-home-features" aria-label="Atlas views">
        {FEATURES.map((entry, i) => (
          <motion.button
            key={entry.id}
            type="button"
            className="ag-home-feature-card"
            onClick={() => go(entry.id)}
            {...fadeUp}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.4,
              delay: shouldReduceMotion ? 0 : 0.15 + i * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <span className="ag-home-feature-icon" aria-hidden="true">
              {entry.icon}
            </span>
            <span className="ag-home-feature-kicker">{entry.title}</span>
            <span className="ag-home-feature-body">{entry.body}</span>
            <span className="ag-home-feature-action">{entry.action} &rarr;</span>
          </motion.button>
        ))}
      </nav>

      {/* Quick links */}
      <motion.div
        className="ag-home-quicklinks"
        {...fadeUp}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.4,
          delay: shouldReduceMotion ? 0 : 0.4,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <span className="ag-home-quicklinks-label">Explore</span>
        <div className="ag-home-quicklinks-row">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              className="ag-home-quicklink"
              onClick={() => go(link.id)}
            >
              {link.label}
            </button>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
