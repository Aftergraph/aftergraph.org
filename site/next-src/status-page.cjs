// /next/status: what needs attention across the public ecosystem, rendered
// server-side from ecosystem-state.json only. No new data source, no client JS:
// failing and pending CI on HEAD, repos the truth layer could not fully read,
// public repos without CI, and repos gone quiet or dormant by HEAD age.
const stEsc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function renderStatusPage(raw) {
  const s = JSON.parse(raw);
  const pub = (s.repos || []).filter((r) => r.visibility !== 'private').sort((a, b) => a.name.localeCompare(b.name));
  const link = (n) => `<a href="https://github.com/Aftergraph/${stEsc(n)}" rel="noopener">${stEsc(n)}</a>`;
  const day = (t) => (t ? stEsc(String(t).slice(0, 10)) : 'unknown');
  const failing = pub.filter((r) => r.status === 'failing');
  const pending = pub.filter((r) => r.status === 'pending' || r.status === 'unknown');
  const errored = pub.filter((r) => Array.isArray(r.errors) && r.errors.length);
  const noCi = pub.filter((r) => r.status === 'no-ci');
  const stale = pub.filter((r) => r.freshness === 'quiet' || r.freshness === 'dormant');
  const section = (id, title, list, render, empty) => `<section id="${id}" data-count="${list.length}"><h2>${stEsc(title)} <span class="n">${list.length}</span></h2>${list.length ? `<ul>${list.map((r) => `<li data-repo="${stEsc(r.name)}">${render(r)}</li>`).join('')}</ul>` : `<p class="dim">${stEsc(empty)}</p>`}</section>`;
  const head = (r) => (r.head ? ` <code>${stEsc(r.head.slice(0, 7))}</code>` : '');
  const sections = [
    section('failing', 'Failing CI on HEAD', failing, (r) => `${link(r.name)}${head(r)} <span class="bad">${stEsc(((r.checks && r.checks.failing) || []).join(', ') || 'failing')}</span>`, 'No public system has failing CI on its default-branch HEAD.'),
    section('pending', 'Pending or unknown', pending, (r) => `${link(r.name)}${head(r)} <span class="warn">${stEsc(r.status)}</span>${r.checks && r.checks.runs != null ? ` <span class="dim">${stEsc(r.checks.runs)} runs</span>` : ''}`, 'Nothing pending.'),
    section('errors', 'Not fully read', errored, (r) => `${link(r.name)} <span class="warn">${stEsc(r.errors.join('; '))}</span>`, 'Every public repo was read without errors.'),
    section('no-ci', 'No CI', noCi, (r) => `${link(r.name)}`, 'Every public repo runs CI.'),
    section('stale', 'Quiet or dormant', stale, (r) => `${link(r.name)} <span class="dim">${stEsc(r.freshness)}, HEAD ${day(r.headAt)}</span>`, 'Every public repo is active.'),
  ].join('\n');
  const attention = failing.length + errored.length;
  const verdict = !s.generatedAt ? '' : attention ? `<p class="verdict bad" id="verdict">${attention} need attention</p>` : `<p class="verdict ok" id="verdict">No failing CI and no read errors${pending.length ? `, ${pending.length} pending` : ''}</p>`;
  const verified = s.generatedAt ? `Verified ${stEsc(s.generatedAt.replace('T', ' ').slice(0, 16))} UTC from ${stEsc(s.source)}` : 'Not generated in this build. Nothing below is claimed.';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Status · Aftergraph</title><meta name="theme-color" content="#04060c">
<style>:root{color-scheme:dark}body{margin:0;background:#04060c;color:#f5f7fa;font:400 15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif}a{color:#42c7e8;text-decoration:none}a:hover{text-decoration:underline}.wrap{width:min(900px,100% - 32px);margin:0 auto}header{display:flex;justify-content:space-between;align-items:center;height:62px;border-bottom:1px solid rgba(137,147,164,.18)}.logo{color:#f5f7fa;font:700 14px/1 'Space Grotesk',Inter,sans-serif;letter-spacing:.2em}h1{font:700 clamp(32px,6vw,56px)/1 'Space Grotesk',Inter,sans-serif;letter-spacing:-.03em;margin:40px 0 12px}h2{font:700 18px/1.2 'Space Grotesk',Inter,sans-serif;margin:28px 0 10px}.n{font:600 12px/1 ui-monospace,Menlo,monospace;color:#8f99ab;margin-left:6px}.lead{color:#8f99ab;max-width:70ch;margin:0 0 20px}.ver{font:600 12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#24c4ad}.verdict{font:700 20px/1.3 'Space Grotesk',Inter,sans-serif;margin:18px 0}ul{list-style:none;padding:0;margin:0;border:1px solid rgba(255,255,255,.1);border-radius:14px}li{padding:10px 14px;border-bottom:1px solid rgba(137,147,164,.12)}li:last-child{border-bottom:0}code{font:12px ui-monospace,Menlo,monospace;color:#c9d1dc}.ok{color:#24c4ad}.warn{color:#f0a64a}.bad{color:#ff5d6c}.dim{color:#8f99ab}footer{color:#8f99ab;font-size:13px;padding:28px 0 40px}</style></head>
<body><div class="wrap"><header><a class="logo" href="/next">AFTERGRAPH</a><nav><a href="/next/ecosystem">Ecosystem</a> · <a href="/next/releases">Releases</a> · <a href="/next/packages">Packages</a> · <a href="/next/ecosystem-state.json">JSON</a></nav></header>
<main><h1>Status</h1><p class="lead">What needs attention across the public systems, from the same build-time read as the ecosystem table. Private systems are not listed.</p>
<p class="ver" id="verified">${verified}</p>
${verdict}
${sections}</main>
<footer>Freshness: ${stEsc(s.freshnessRule || 'unknown')}. Source: <a href="https://github.com/Aftergraph/aftergraph.org/blob/main/site/next-src/TRUTH-LAYER.md" rel="noopener">TRUTH-LAYER.md</a></footer></div></body></html>`;
}
module.exports = { renderStatusPage };
