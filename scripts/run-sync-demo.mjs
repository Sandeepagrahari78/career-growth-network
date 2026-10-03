import { execFileSync } from 'node:child_process';
const run=(file,args=[])=>execFileSync(process.execPath,[file,...args],{stdio:'inherit'});
run('scripts/agent-context.mjs',['--ticket','DEMO-001','--domain','Roadmap->Social']);
run('demo/module-a/index.mjs');
run('scripts/demo-handoff.mjs');
run('demo/module-b/index.mjs');
console.log('\nSUCCESS: context survived Agent A -> handoff -> Agent B.');
