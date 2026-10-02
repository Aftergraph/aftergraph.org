// /next/ecosystem: every catalog repo rendered server-side from the truth layer.
// No client JS needed; the page is only as current as ecosystem-state.json.
const ecoEsc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ECO_ORDER = { failing: 0, pending: 1, unknown: 2, passing: 3, 'no-ci': 4, private: 5 };
const ECO_COLOR = { failing: '#ff5d6c', pending: '#f0a64a', unknown: '#8f99ab', passing: '#24c4ad', 'no-ci': '#8f99ab', private: '#7759e8' };
function renderEcosystemPage(raw) {
  const s = JSON.parse(raw);
  const repos = [...(s.repos || [])].sort((a, b) => (ECO_ORDER[a.status] ?? 9) - (ECO_ORDER[b.status] ?? 9) || a.name.localeCompare(b.name));
  const c = s.counts || {};
  const day = (t) => (t ? ecoEsc(String(t).slice(0, 10)) : 'unknown');
  const row = (r) => {
    const pub = r.visibility !== 'private';
    const name = pub ? `<a href="https://github.com/Aftergraph/${ecoEsc(r.name)}" rel="noopener">${ecoEsc(r.name)}</a>` : ecoEsc(r.name);
    const rel = r.release ? `${ecoEsc(r.release.tag)}${r.release.aheadBy ? ` <span class="warn">+${ecoEsc(r.release.aheadBy)}</span>` : ''}` : (pub ? '<span class="dim">none</span>' : '');
    const failing = r.checks && r.checks.failing && r.checks.failing.length ? ecoEsc(r.checks.failing.join(', ')) : '';
    return `<tr data-repo="${ecoEsc(r.name)}" data-status="${ecoEsc(r.status)}"><td>${name}</td><td><span class="st" style="--c:${ECO_COLOR[r.status] || '#8f99ab'}">${ecoEsc(r.status)}</span></td><td>${pub ? ecoEsc(r.freshness || 'unknown') : ''}</td><td>${pub && r.head ? `<code>${ecoEsc(r.head.slice(0, 7))}</code> ${day(r.headAt)}` : ''}</td><td>${rel}</td><td>${pub && r.openPRs != null ? ecoEsc(r.openPRs) : ''}</td><td>${failing}</td></tr>`;
  };
  const verified = s.generatedAt ? `Verified ${ecoEsc(s.generatedAt.replace('T', ' ').slice(0, 16))} UTC from ${ecoEsc(s.source)}` : 'Not generated in this build. Nothing below is claimed.';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Ecosystem · Aftergraph</title><meta name="theme-color" content="#04060c">
<style>:root{color-scheme:dark}body{margin:0;background:#04060c;color:#f5f7fa;font:400 15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif}a{color:#42c7e8;text-decoration:none}a:hover{text-decoration:underline}.wrap{width:min(1240px,100% - 32px);margin:0 auto}header{display:flex;justify-content:space-between;align-items:center;height:62px;border-bottom:1px solid rgba(137,147,164,.18)}.logo{color:#f5f7fa;font:700 14px/1 'Space Grotesk',Inter,sans-serif;letter-spacing:.2em}h1{font:700 clamp(32px,6vw,56px)/1 'Space Grotesk',Inter,sans-serif;letter-spacing:-.03em;margin:40px 0 12px}.lead{color:#8f99ab;max-width:70ch;margin:0 0 20px}.ver{font:600 12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#24c4ad}.counts{display:flex;flex-wrap:wrap;gap:8px;margin:22px 0}.counts span{padding:7px 12px;border:1px solid rgba(255,255,255,.12);border-radius:999px;font:600 12px/1 ui-monospace,Menlo,monospace}.tw{overflow-x:auto;border:1px solid rgba(255,255,255,.1);border-radius:14px;margin-bottom:28px}table{border-collapse:collapse;width:100%;min-width:760px}th,td{text-align:left;padding:10px 14px;border-bottom:1px solid rgba(137,147,164,.12);vertical-align:top}th{font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:#8f99ab;background:rgba(255,255,255,.03)}tr:last-child td{border-bottom:0}code{font:12px ui-monospace,Menlo,monospace;color:#c9d1dc}.st{display:inline-flex;align-items:center;gap:6px;font:600 12px/1 ui-monospace,Menlo,monospace}.st:before{content:'';width:8px;height:8px;border-radius:50%;background:var(--c)}.warn{color:#f0a64a}.dim{color:#8f99ab}footer{color:#8f99ab;font-size:13px;padding:0 0 40px}</style></head>
<body><div class="wrap"><header><a class="logo" href="/next">AFTERGRAPH</a><nav><a href="/next#live">Live</a> · <a href="/next/releases">Releases</a> · <a href="/next/status">Status</a> · <a href="/next/ecosystem-state.json">JSON</a></nav></header>
<main><h1>Ecosystem</h1><p class="lead">Every system in the platform catalog, with CI on the exact default-branch HEAD, freshness, and how far main has moved past the latest release. Private systems are listed by name only.</p>
<p class="ver" id="verified">${verified}</p>
<div class="counts"><span>${ecoEsc(c.total ?? 0)} systems</span><span>${ecoEsc(c.passing ?? 0)} passing</span><span>${ecoEsc(c.failing ?? 0)} failing</span><span>${ecoEsc(c.pending ?? 0)} pending</span><span>${ecoEsc(c.noCi ?? 0)} no CI</span><span>${ecoEsc(c.private ?? 0)} private</span></div>
<div class="tw"><table><thead><tr><th>System</th><th>CI on HEAD</th><th>Freshness</th><th>HEAD</th><th>Release</th><th>Open PRs</th><th>Failing checks</th></tr></thead><tbody>
${repos.map(row).join('\n') || '<tr><td colspan="7" class="dim">No state in this build.</td></tr>'}
</tbody></table></div></main>
<footer>Release "+N" means main is N commits past that release. Source: <a href="https://github.com/Aftergraph/aftergraph.org/blob/main/site/next-src/TRUTH-LAYER.md" rel="noopener">TRUTH-LAYER.md</a></footer></div></body></html>`;
}
module.exports = { renderEcosystemPage };
