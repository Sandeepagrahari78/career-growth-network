import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const getArg = (name, fallback='UNKNOWN') => {
  const i = args.indexOf(name);
  return i >= 0 && args[i+1] ? args[i+1] : fallback;
};
const ticket = getArg('--ticket');
const domain = getArg('--domain', 'unspecified');
const outArg = getArg('--out', `.cgn/context-${ticket}.md`);

const sources = [
  'AGENTS.md',
  'docs/engineering-memory/00-product-north-star.md',
  'docs/engineering-memory/01-system-map.md',
  'docs/engineering-memory/02-domain-ownership.md',
  'docs/engineering-memory/03-contract-registry.md',
  'docs/engineering-memory/04-decisions.md',
  'docs/engineering-memory/05-current-state.md',
  'docs/engineering-memory/06-known-risks.md',
  'docs/engineering-memory/07-handoff-protocol.md',
  'docs/engineering-memory/08-agent-rules.md'
];
const workItem = `docs/work-items/${ticket}.md`;
if (fs.existsSync(path.join(root, workItem))) sources.push(workItem);

let body = `# CGN Agent Context Bundle\n\nTicket: ${ticket}\nDomain: ${domain}\nGenerated: ${new Date().toISOString()}\n\n> This bundle is generated from repository-owned Engineering Memory. Jira remains the product/work source of truth.\n\n`;
for (const rel of sources) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  body += `\n---\n\n## SOURCE: ${rel}\n\n${fs.readFileSync(full,'utf8').trim()}\n`;
}
fs.mkdirSync(path.dirname(path.join(root,outArg)), {recursive:true});
fs.writeFileSync(path.join(root,outArg), body);
console.log(`Generated ${outArg}`);
