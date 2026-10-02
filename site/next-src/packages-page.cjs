// /next/packages: what each public system declares as a package at its exact
// HEAD (root package.json / pyproject.toml) and what the public registry says
// about that name. Server-rendered from ecosystem-state.json, no client JS.
// A registry entry only counts as ours when it links back to an Aftergraph repo.
const pkEsc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PK_ORDER = { 'name-taken': 0, unpublished: 1, unknown: 2, private: 3, published: 4 };
function renderPackagesPage(raw) {
  const s = JSON.parse(raw);
  const pub = (s.repos || []).filter((r) => r.visibility !== 'private');
  const rows = [];
  for (const r of pub) for (const p of (Array.isArray(r.packages) ? r.packages : [])) rows.push({ repo: r.name, ...p });
  rows.sort((a, b) => (PK_ORDER[a.registry] ?? 2) - (PK_ORDER[b.registry] ?? 2) || a.repo.localeCompare(b.repo) || a.ecosystem.localeCompare(b.ecosystem));
  const read = pub.filter((r) => Array.isArray(r.packages));
  const none = read.filter((r) => r.packages.length === 0).map((r) => r.name).sort();
  const unread = pub.filter((r) => !Array.isArray(r.packages)).map((r) => r.name).sort();
  const count = (k) => rows.filter((p) => p.registry === k).length;
  const regUrl = (p) => (p.ecosystem === 'npm' ? `https://www.npmjs.com/package/${p.name}` : `https://pypi.org/project/${encodeURIComponent(p.name)}/`);
  const cell = (p) => {
    switch (p.registry) {
      case 'published': return `<a class="ok" href="${pkEsc(regUrl(p))}" rel="noopener">published${p.registryVersion ? ` ${pkEsc(p.registryVersion)}` : ''}</a>`;
      case 'unpublished': return '<span class="warn">not on the registry</span>';
      case 'name-taken': return `<a class="bad" href="${pkEsc(regUrl(p))}" rel="noopener">name taken, not linked to Aftergraph</a>`;
      case 'private': return '<span class="dim">private manifest, not publishable</span>';
      default: return '<span class="dim">not read</span>';
    }
  };
  const row = (p) => `<tr data-repo="${pkEsc(p.repo)}" data-ecosystem="${pkEsc(p.ecosystem)}" data-registry="${pkEsc(p.registry || 'unknown')}"><td><a href="https://github.com/Aftergraph/${pkEsc(p.repo)}" rel="noopener">${pkEsc(p.repo)}</a></td><td>${pkEsc(p.ecosystem)}</td><td><code>${pkEsc(p.name)}</code>${p.version ? ` <span class="dim">${pkEsc(p.version)}</span>` : ''}</td><td>${cell(p)}</td></tr>`;
  const verified = s.generatedAt ? `Verified ${pkEsc(s.generatedAt.replace('T', ' ').slice(0, 16))} UTC from ${pkEsc(s.source)} and the public npm and PyPI registries` : 'Not generated in this build. Nothing below is claimed.';
  const summary = s.generatedAt ? `<p class="ver" id="summary" data-published="${count('published')}" data-unpublished="${count('unpublished')}" data-taken="${count('name-taken')}" data-private="${count('private')}">${count('published')} published · ${count('unpublished')} not on a registry · ${count('private')} private manifests${count('name-taken') ? ` · ${count('name-taken')} name taken` : ''}</p>` : '';
  const links = (list) => list.map((n) => `<a href="https://github.com/Aftergraph/${pkEsc(n)}" rel="noopener">${pkEsc(n)}</a>`).join(' · ');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Packages · Aftergraph</title><meta name="theme-color" content="#04060c">
<style>:root{color-scheme:dark}body{margin:0;background:#04060c;color:#f5f7fa;font:400 15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif}a{color:#42c7e8;text-decoration:none}a:hover{text-decoration:underline}.wrap{width:min(1100px,100% - 32px);margin:0 auto}header{display:flex;justify-content:space-between;align-items:center;height:62px;border-bottom:1px solid rgba(137,147,164,.18)}.logo{color:#f5f7fa;font:700 14px/1 'Space Grotesk',Inter,sans-serif;letter-spacing:.2em}h1{font:700 clamp(32px,6vw,56px)/1 'Space Grotesk',Inter,sans-serif;letter-spacing:-.03em;margin:40px 0 12px}h2{font:700 18px/1.2 'Space Grotesk',Inter,sans-serif;margin:28px 0 10px}.lead{color:#8f99ab;max-width:70ch;margin:0 0 20px}.ver{font:600 12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#24c4ad}.tw{overflow-x:auto;border:1px solid rgba(255,255,255,.1);border-radius:14px;margin-bottom:28px}table{border-collapse:collapse;width:100%;min-width:640px}th,td{text-align:left;padding:10px 14px;border-bottom:1px solid rgba(137,147,164,.12);vertical-align:top}th{font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:#8f99ab;background:rgba(255,255,255,.03)}tr:last-child td{border-bottom:0}code{font:12px ui-monospace,Menlo,monospace;color:#c9d1dc}.ok{color:#24c4ad}.warn{color:#f0a64a}.bad{color:#ff5d6c}.dim{color:#8f99ab}footer{color:#8f99ab;font-size:13px;padding:0 0 40px}</style></head>
<body><div class="wrap"><header><a class="logo" href="/next">AFTERGRAPH</a><nav><a href="/next/ecosystem">Ecosystem</a> · <a href="/next/releases">Releases</a> · <a href="/next/status">Status</a> · <a href="/next/ecosystem-state.json">JSON</a></nav></header>
<main><h1>Packages</h1><p class="lead">What every public system declares as a package at its exact HEAD, and what npm and PyPI actually hold under that name. An install line only works when the row says published. Private systems are not listed.</p>
<p class="ver" id="verified">${verified}</p>${summary}
<div class="tw"><table><thead><tr><th>System</th><th>Registry</th><th>Declared at HEAD</th><th>On the registry</th></tr></thead><tbody>
${rows.map(row).join('\n') || '<tr><td colspan="4" class="dim">No package manifests in this build.</td></tr>'}
</tbody></table></div>
<h2>No root package manifest</h2><p class="dim" id="no-manifest">${none.length ? links(none) : 'None.'}</p>
${unread.length ? `<h2>Not read</h2><p class="dim" id="unread">${links(unread)}</p>` : ''}</main>
<footer>Only root package.json and pyproject.toml are read; workspaces inside a monorepo are not. "Published" means the registry entry links back to github.com/Aftergraph. Source: <a href="https://github.com/Aftergraph/aftergraph.org/blob/main/site/next-src/TRUTH-LAYER.md" rel="noopener">TRUTH-LAYER.md</a></footer></div></body></html>`;
}
module.exports = { renderPackagesPage };
