const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const write = (name, content) => fs.writeFileSync(path.join(root, name), content);

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  assert.ok(source.includes(before), `missing patch anchor: ${label}`);
  return source.replace(before, after);
}

let landing = read('index.html');
landing = replaceOnce(
  landing,
  '<a href="/.well-known/security.txt">Security</a><a href="/healthz">Health</a>',
  '<a href="/.well-known/security.txt">Security</a><a href="/status">Status</a><a href="/healthz">Health</a>',
  'landing status footer link',
);
write('index.html', landing);

let launcher = read('launch.html');
launcher = replaceOnce(
  launcher,
  "{group:'Build',name:'Developer Quickstart',purpose:'Start with the first useful path through the Knowledge Plane.',url:'https://docs.aftergraph.org/developers/quickstart/',maturity:'public',type:'docs'},",
  "{group:'Build',name:'Developer Quickstart',purpose:'Start with the first useful path through the Knowledge Plane.',url:'https://docs.aftergraph.org/developers/quickstart/',maturity:'public',type:'docs'},\n{group:'Build',name:'Knowledge Plane',purpose:'Developer, standards, evidence and research portal compiled from canonical sources.',url:'https://docs.aftergraph.org/',maturity:'public',type:'docs'},",
  'Knowledge Plane launcher destination',
);
write('launch.html', launcher);

console.log('Applied latest-main navigation contracts to V2 sources.');
