const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const write = (name, content) => fs.writeFileSync(path.join(root, name), content);

let launcher = read('launch.html');
launcher = launcher
  .split('\n')
  .filter((line) => !line.includes("url:'https://github.com/Aftergraph/afm'"))
  .join('\n');
assert.ok(!launcher.includes('https://github.com/Aftergraph/afm'), 'private AFM repository link remained in public launcher');
assert.ok(!launcher.includes('https://github.com/Aftergraph/context-continuity'), 'private context-continuity repository link remained in public launcher');
assert.ok(!launcher.includes('https://github.com/Aftergraph/skills-vault'), 'private skills-vault repository link remained in public launcher');
write('launch.html', launcher);

let llms = read('llms.txt');
const contextPacks = `## Context packs (ACC-shaped, machine-usable)\n\n- [Index](https://docs.aftergraph.org/context/index.json)\n- [Platform](https://docs.aftergraph.org/context/platform.json)\n- [Golden Mission](https://docs.aftergraph.org/context/platform.golden-mission.json)\n- [Developers](https://docs.aftergraph.org/context/developers.json)\n- [Research](https://docs.aftergraph.org/context/research.json)\n- [Standards](https://docs.aftergraph.org/context/standards.json)\n\n`;
if (!llms.includes('## Context packs (ACC-shaped, machine-usable)')) {
  assert.ok(llms.includes('## Organization\n'), 'missing Organization anchor in llms.txt');
  llms = llms.replace('## Organization\n', contextPacks + '## Organization\n');
}
write('llms.txt', llms);

console.log('Integrated main #20/#21 semantics: no dead private repo links; public context packs exposed.');
