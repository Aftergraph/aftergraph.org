// /next/releases: release drift per public system, rendered server-side from
// the same truth layer as /next/ecosystem. No client JS; only as current as
// ecosystem-state.json. "+N" is the GitHub compare ahead_by of main vs the tag.
const relEsc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function renderReleasesPage(raw) {
  const s = JSON.parse(raw);
  const pub = (s.repos || []).filter((r) => r.visibility !== 'private');
  const released = pub.filter((r) => r.release && r.release.tag)
    .sort((a, b) => (b.release.aheadBy ?? -1) - (a.release.aheadBy ?? -1) || a.name.localeCompare(b.name));
  const unreleased = pub.filter((r) => !(r.release && r.release.tag)).map((r) => r.name).sort();
  const day = (t) => (t ? relEsc(String(t).slice(0, 10)) : '<span class="dim">unknown</span>');
  const drift = (r) => {
    const a = r.release.aheadBy;
    if (a == null) return '<span class="dim">unknown</span>';
    const cls = a === 0 ? 'ok' : a >= 50 ? 'bad' : 'warn';
    const link = `https://github.com/Aftergraph/${relEsc(r.name)}/compare/${encodeURIComponent(r.release.tag)}...${encodeURIComponent(r.branch || 'main')}`;
    return `<a class="${cls}" href="${link}" rel="noopener">${a === 0 ? 'at release' : `+${relEsc(a)}`}</a>`;
  };
  const row = (r) => `<tr data-repo="${relEsc(r.name)}" data-ahead="${relEsc(r.release.aheadBy ?? '')}"><td><a href="https://github.com/Aftergraph/${relEsc(r.name)}" rel="noopener">${relEsc(r.name)}</a></td><td>${r.release.url ? `<a href="${relEsc(r.release.url)}" rel="noopener"><code>${relEsc(r.release.tag)}</code></a>` : `<code>${relEsc(r.release.tag)}</code> <span class="dim">tag only</span>`}</td><td>${day(r.release.at)}</td><td>${drift(r)}</td><td>${relEsc(r.status || 'unknown')}</td></tr>`;
  const verified = s.generatedAt ? `Verified ${relEsc(s.generatedAt.replace('T', ' ').slice(0, 16))} UTC from ${relEsc(s.source)}` : 'Not generated in this build. Nothing below is claimed.';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Releases · Aftergraph</title><meta name="theme-color" content="#04060c">
<style>:root{color-scheme:dark}body{margin:0;background:#04060c;color:#f5f7fa;font:400 15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif}a{color:#42c7e8;text-decoration:none}a:hover{text-decoration:underline}.wrap{width:min(1100px,100% - 32px);margin:0 auto}header{display:flex;justify-content:space-between;align-items:center;height:62px;border-bottom:1px solid rgba(137,147,164,.18)}.logo{color:#f5f7fa;font:700 14px/1 'Space Grotesk',Inter,sans-serif;letter-spacing:.2em}h1{font:700 clamp(32px,6vw,56px)/1 'Space Grotesk',Inter,sans-serif;letter-spacing:-.03em;margin:40px 0 12px}h2{font:700 18px/1.2 'Space Grotesk',Inter,sans-serif;margin:28px 0 10px}.lead{color:#8f99ab;max-width:70ch;margin:0 0 20px}.ver{font:600 12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#24c4ad}.tw{overflow-x:auto;border:1px solid rgba(255,255,255,.1);border-radius:14px;margin-bottom:28px}table{border-collapse:collapse;width:100%;min-width:640px}th,td{text-align:left;padding:10px 14px;border-bottom:1px solid rgba(137,147,164,.12);vertical-align:top}th{font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:#8f99ab;background:rgba(255,255,255,.03)}tr:last-child td{border-bottom:0}code{font:12px ui-monospace,Menlo,monospace;color:#c9d1dc}.ok{color:#24c4ad}.warn{color:#f0a64a}.bad{color:#ff5d6c}.dim{color:#8f99ab}footer{color:#8f99ab;font-size:13px;padding:0 0 40px}</style></head>
<body><div class="wrap"><header><a class="logo" href="/next">AFTERGRAPH</a><nav><a href="/next/ecosystem">Ecosystem</a> · <a href="/next/status">Status</a> · <a href="/next/ecosystem-state.json">JSON</a></nav></header>
<main><h1>Releases</h1><p class="lead">The latest release of every public system and how far its default branch has moved past it. A large drift means shipped code is not what main says. Private systems are not listed.</p>
<p class="ver" id="verified">${verified}</p>
<div class="tw"><table><thead><tr><th>System</th><th>Latest release</th><th>Published</th><th>Main vs release</th><th>CI on HEAD</th></tr></thead><tbody>
${released.map(row).join('\n') || '<tr><td colspan="5" class="dim">No releases in this build.</td></tr>'}
</tbody></table></div>
<h2>No release yet</h2><p class="dim" id="unreleased">${unreleased.length ? unreleased.map((n) => `<a href="https://github.com/Aftergraph/${relEsc(n)}" rel="noopener">${relEsc(n)}</a>`).join(' · ') : 'None.'}</p></main>
<footer>"+N" is GitHub's compare ahead_by for main against the release tag at build time. Source: <a href="https://github.com/Aftergraph/aftergraph.org/blob/main/site/next-src/TRUTH-LAYER.md" rel="noopener">TRUTH-LAYER.md</a></footer></div></body></html>`;
}
module.exports = { renderReleasesPage };
