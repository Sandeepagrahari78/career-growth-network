import { execSync } from 'node:child_process';
const memoryPrefixes=['docs/engineering-memory/','docs/adr/','docs/handoffs/','packages/contracts/','.cgn/'];
let changed=[];
try { changed=execSync('git diff --cached --name-only',{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean); }
catch { console.log('No git repository/staged diff yet; memory check skipped.'); process.exit(0); }
if(!changed.length){console.log('No staged changes.');process.exit(0)}
const meaningful=changed.some(f=>/^(apps|services|packages)\//.test(f));
const memoryTouched=changed.some(f=>memoryPrefixes.some(p=>f.startsWith(p)));
if(meaningful&&!memoryTouched){
 console.error('Memory check failed: implementation changed but no Engineering Memory / contract / handoff file is staged.');
 console.error('Update the relevant memory or add a handoff note.');
 process.exit(1);
}
console.log('Memory check passed.');
