#!/usr/bin/env node
import fs from "node:fs/promises";
import { performance } from "node:perf_hooks";

const corpusPath = process.argv[2];
const outPath = process.argv[3];
const threshold = Number(process.env.JEV_EVAL_THRESHOLD ?? "0.70");
const key = process.env.TYPESAFE_API_KEY || "";
if (!key) {
  console.error("LIVE_EVAL_BLOCKED: TYPESAFE_API_KEY missing");
  process.exit(78);
}

const corpus = JSON.parse(await fs.readFile(corpusPath, "utf8"));

const definitions = {
  placement: {
    instructions: "Choose the safest eligible execution placement. Prefer the always-on VDS for ordinary server work. Use Lenovo only when the state explicitly requires Windows, GPU, local desktop, local files, or local devices. Choose clarify when requirements are insufficient.",
    criteria: {
      vds: "Always-on server/VDS is sufficient and preferred.",
      lenovo: "The user's workstation is explicitly required by Windows/GPU/local desktop/local file/local device needs.",
      clarify: "Requirements are insufficient to decide safely."
    }
  },
  recovery: {
    instructions: "Choose the next recovery directive. Do not retry authority or verification failures blindly.",
    criteria: {
      retry: "Transient and safe to retry.",
      replace_node: "Execution environment or worker failed; place on another eligible node.",
      request_authority: "Authority is missing, expired, or revoked.",
      falsify_again: "Evidence or verification is stale/failed and must be independently checked again.",
      refresh_dependency: "Dependency/package/version state is the cause.",
      restore_checkpoint: "Logic/invariant regression requires rollback or checkpoint restore.",
      halt: "Unknown or unsafe to continue automatically."
    }
  },
  topology: {
    instructions: "Choose the smallest effective multi-agent topology. Do not spawn extra agents unless independent information gain is useful.",
    criteria: {
      solo: "One deterministic/single-track worker is enough.",
      parallel: "Independent work can run concurrently and simple joining is enough.",
      critic_pair: "A primary worker plus an independent adversarial critic/falsifier is useful.",
      fanout_reduce: "Multiple independent claim-producing tracks require evidence-aware reduction."
    }
  }
};

function baseline(c) {
  const s = c.state.toLowerCase();
  if (c.task === "placement") {
    if (/incomplete|do not say|insufficient/.test(s)) return "clarify";
    if (/windows|gpu|nvidia|desktop|usb|only exists on the user's workstation|local file/.test(s)) return "lenovo";
    return "vds";
  }
  if (c.task === "recovery") {
    if (/revoked|authority lease|forbidden|unauthor/.test(s)) return "request_authority";
    if (/sentinel|stale evidence|verification failed|exact-head/.test(s)) return "falsify_again";
    if (/runner offline|worker reports|environment/.test(s)) return "replace_node";
    if (/dependency|package lock|version/.test(s)) return "refresh_dependency";
    if (/invariant|assertion|logic/.test(s)) return "restore_checkpoint";
    if (/429|connection reset|timeout|retry-after/.test(s)) return "retry";
    return "halt";
  }
  if (/deterministic|single exact-head|one deterministic/.test(s)) return "solo";
  if (/critic|falsifier|adversarial/.test(s)) return "critic_pair";
  if (/claims must be merged|reduced into one evidence|source tracks/.test(s)) return "fanout_reduce";
  if (/concurrently|same time|parallel/.test(s)) return "parallel";
  return "solo";
}

async function ask(c) {
  const def = definitions[c.task];
  const body = {
    model: "jev-latest",
    state: { text: c.state, task: c.task },
    questions: {
      decision: {
        type: "choice",
        instructions: def.instructions,
        criteria: def.criteria
      }
    }
  };
  const started = performance.now();
  const res = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const latencyMs = performance.now() - started;
  const raw = await res.text();
  if (!res.ok) throw new Error(`provider_http_${res.status}`);
  const json = JSON.parse(raw);
  const ans = json?.answers?.decision;
  if (!ans || ans.type !== "choice" || typeof ans.choice !== "string") {
    throw new Error("invalid_choice_response");
  }
  const probabilities = ans.probabilities ?? {};
  const p = Number(probabilities[ans.choice] ?? ans.confidence ?? 0);
  return {
    choice: ans.choice,
    probabilities,
    confidence: Number(ans.confidence ?? p),
    selectedProbability: p,
    latencyMs,
    model: json.model ?? "jev-latest",
    usage: json.usage ?? null
  };
}

function brier(probabilities, expected, labels) {
  let sum = 0;
  for (const label of labels) {
    const p = Number(probabilities?.[label] ?? 0);
    const y = label === expected ? 1 : 0;
    sum += (p - y) ** 2;
  }
  return sum;
}

const rows = [];
for (const c of corpus.cases) {
  const baseChoice = baseline(c);
  const live = await ask(c);
  const labels = Object.keys(definitions[c.task].criteria);
  rows.push({
    id: c.id,
    task: c.task,
    expected: c.expected,
    baselineChoice: baseChoice,
    baselineCorrect: baseChoice === c.expected,
    jevChoice: live.choice,
    jevCorrect: live.choice === c.expected,
    jevAccepted: live.selectedProbability >= threshold,
    jevSelectedProbability: live.selectedProbability,
    jevConfidence: live.confidence,
    jevBrier: brier(live.probabilities, c.expected, labels),
    latencyMs: live.latencyMs,
    model: live.model,
    usage: live.usage
  });
}

const mean = xs => xs.reduce((a,b)=>a+b,0)/Math.max(xs.length,1);
const accepted = rows.filter(r=>r.jevAccepted);
const summary = {
  schema: "jev-vnext-eval/0.1",
  provider: "typesafe-direct",
  model: rows[0]?.model ?? "jev-latest",
  threshold,
  cases: rows.length,
  baselineAccuracy: mean(rows.map(r=>Number(r.baselineCorrect))),
  jevRawAccuracy: mean(rows.map(r=>Number(r.jevCorrect))),
  jevCoverage: accepted.length / rows.length,
  jevAcceptedAccuracy: accepted.length ? mean(accepted.map(r=>Number(r.jevCorrect))) : null,
  wrongRouteRateAccepted: accepted.length ? mean(accepted.map(r=>Number(!r.jevCorrect))) : null,
  meanBrier: mean(rows.map(r=>r.jevBrier)),
  meanLatencyMs: mean(rows.map(r=>r.latencyMs)),
  p95LatencyMs: [...rows].sort((a,b)=>a.latencyMs-b.latencyMs)[Math.max(0, Math.ceil(rows.length*0.95)-1)]?.latencyMs ?? null,
  totalInputTokens: rows.reduce((n,r)=>n + Number(r.usage?.input_tokens ?? 0),0),
  totalOutputTokens: rows.reduce((n,r)=>n + Number(r.usage?.output_tokens ?? 0),0)
};
summary.accuracyDeltaVsBaseline = summary.jevRawAccuracy - summary.baselineAccuracy;
summary.modelWorks =
  summary.jevRawAccuracy >= 0.75 &&
  (summary.jevAcceptedAccuracy ?? 0) >= 0.85 &&
  (summary.wrongRouteRateAccepted ?? 1) <= 0.15;
summary.outperformsBaseline = summary.jevRawAccuracy > summary.baselineAccuracy;

await fs.mkdir("ops/typesafe-proof/artifacts", { recursive: true });
await fs.writeFile(outPath, JSON.stringify({summary, rows}, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
if (!summary.modelWorks) process.exitCode = 2;
