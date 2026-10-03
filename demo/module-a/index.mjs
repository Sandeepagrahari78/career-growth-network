import fs from 'node:fs';
fs.mkdirSync('.cgn/demo',{recursive:true});
const event={
  eventId:'evt-demo-001',
  eventType:'career.activity.created',
  eventVersion:1,
  occurredAt:new Date().toISOString(),
  producer:'demo-module-a',
  subjectId:'user-demo-001',
  payload:{
    activityId:'act-demo-001',
    userId:'user-demo-001',
    kind:'mission_completed',
    occurredAt:new Date().toISOString(),
    sourceDomain:'Roadmap',
    sourceEntityId:'mission-demo-001',
    visibility:'connections',
    summary:'Completed today\'s demo mission'
  }
};
fs.writeFileSync('.cgn/demo/module-a-event.json',JSON.stringify(event,null,2));
console.log('Module A produced a versioned Career Activity event.');
