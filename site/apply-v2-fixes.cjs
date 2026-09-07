const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const write = (name, value) => fs.writeFileSync(path.join(root, name), value);

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  assert.ok(source.includes(before), `missing patch anchor: ${label}`);
  return source.replace(before, after);
}

let launcher = read('launch.html');
launcher = replaceRequired(
  launcher,
  "if(!options.length){active=0;return}active=",
  "if(!options.length){active=0;q.removeAttribute('aria-activedescendant');return}active=",
  'launcher empty active-descendant state',
);
launcher = replaceRequired(
  launcher,
  "if(selected)el.scrollIntoView({block:'nearest'})})}",
  "if(selected){q.setAttribute('aria-activedescendant',el.id);el.scrollIntoView({block:'nearest'})}})}",
  'launcher active-descendant update',
);
launcher = replaceRequired(
  launcher,
  "a.className='item';a.href=item.url;a.dataset.index=String(index);",
  "a.className='item';a.href=item.url;a.id=`launcher-option-${index}`;a.dataset.index=String(index);",
  'launcher stable option id',
);
write('launch.html', launcher);

let build = read('build-worker.cjs');
build = replaceRequired(
  build,
  "const nf = read('404.html');\n",
  "const nf = read('404.html');\nconst st = read('status.html');\n",
  'status source',
);
build = replaceRequired(
  build,
  '  <url><loc>https://aftergraph.org/launch</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n',
  '  <url><loc>https://aftergraph.org/launch</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n  <url><loc>https://aftergraph.org/status</loc><changefreq>daily</changefreq><priority>0.7</priority></url>\n',
  'status sitemap entry',
);
if (!build.includes('const STATUS =')) {
  build = replaceRequired(
    build,
    'const NOTFOUND = ${JSON.stringify(nf)};\n',
    'const NOTFOUND = ${JSON.stringify(nf)};\nconst STATUS = ${JSON.stringify(st)};\n',
    'compiled status constant',
  );
}
if (!build.includes("p === '/status' || p === '/status/'")) {
  build = replaceRequired(
    build,
    "  else if (p === '/launch' || p === '/launch/') { body = LAUNCH; }\n",
    "  else if (p === '/launch' || p === '/launch/') { body = LAUNCH; }\n  else if (p === '/status' || p === '/status/') { body = STATUS; }\n",
    'status route',
  );
}
write('build-worker.cjs', build);

const statusData = JSON.parse(read('status-data.json'));
const publicRepos = statusData.repos.filter((repo) => repo.visibility === 'public');
assert.equal(publicRepos.length, statusData.repos.length, 'status-data contains non-public repositories');

let status = read('status.html');
const repoHeading = `<h2>Repositories <span class="meta">(${publicRepos.length} public repositories · GitHub API snapshot)</span></h2>`;
status = status.replace(
  /<h2>Repositories <span class="meta">\([^<]*\)<\/span><\/h2>/,
  repoHeading,
);
assert.ok(status.includes(repoHeading), 'status repository heading was not normalized');
status = status
  .split('\n')
  .filter((line) => !line.includes('context-continuity') && !line.includes('skills-vault'))
  .join('\n');
assert.ok(!status.includes('context-continuity'), 'private context-continuity row remained');
assert.ok(!status.includes('skills-vault'), 'private skills-vault row remained');
write('status.html', status);

const deploymentPath = path.join(root, '..', 'DEPLOYMENT.md');
let deployment = fs.readFileSync(deploymentPath, 'utf8');
deployment = deployment.replace(
  'health (`/healthz`), `robots.txt` and `sitemap.xml`',
  'health (`/healthz`), operational status (`/status`), `robots.txt` and `sitemap.xml`',
);
deployment = deployment.replace(
  '`/launch`, `/robots.txt` and `/sitemap.xml`.',
  '`/launch`, `/status`, `/robots.txt` and `/sitemap.xml`.',
);
fs.writeFileSync(deploymentPath, deployment);

console.log('Applied V2 integration fixes: launcher a11y, public status, worker route, sitemap, deployment docs.');
