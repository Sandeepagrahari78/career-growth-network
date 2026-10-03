import fs from 'node:fs';
const event=JSON.parse(fs.readFileSync('.cgn/demo/module-a-event.json','utf8'));
const note=`# Handoff - DEMO-001\n\n- Ticket: DEMO-001\n- Branch: demo/agent-a\n- Agent/person: Agent A simulation\n- Date: ${new Date().toISOString()}\n\n## What changed\nModule A produced ${event.eventType} using eventVersion ${event.eventVersion}.\n\n## Contracts changed\nNone. Used existing career activity contract.\n\n## Events produced / consumed\nProduced: ${event.eventType}.\n\n## Exact next step for next agent\nConsume the event without inventing a new schema. Respect visibility and eventVersion.\n\n## Engineering Memory updated\nDemo handoff created.\n`;
fs.writeFileSync('docs/handoffs/DEMO-001.md',note);
console.log('Agent A handoff written.');
