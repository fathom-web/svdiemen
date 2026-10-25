'use strict';
/* Run from GitHub Actions. Reads shared state and creates one plan for Saturday.
   GitHub scheduled Actions are best effort, not an exact-time deadline clock.
   Never uses secret/service_role keys. Public prototype state only. */
const {createPlan}=require('../lineup-engine.js');
const SUPABASE_URL=process.env.SUPABASE_URL;
const KEY=process.env.SUPABASE_PUBLISHABLE_KEY;
if(!SUPABASE_URL||!KEY)throw Error('Missing Supabase public configuration');
const DRY_RUN=process.env.DRY_RUN==='true';
const MANUAL=process.env.GITHUB_EVENT_NAME==='workflow_dispatch';
const ENDPOINT=SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/jo163_app_state';
const headers={apikey:KEY,'Content-Type':'application/json'};
function amsterdamDate(){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Amsterdam',
  year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',
  hourCycle:'h23',minute:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return parts;
}
function datePlus(date,days){
 const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
}
async function fetchState(){
 const r=await fetch(ENDPOINT+'?select=data,updated_at&id=eq.1',{headers});
 if(!r.ok)throw Error('Supabase read failed: '+r.status);
 const rows=await r.json();
 if(!rows.length)throw Error('Supabase state row missing');
 return rows[0];
}
async function patchWithVersion(state,updatedAt){
 const url=ENDPOINT+'?id=eq.1&updated_at=eq.'+encodeURIComponent(updatedAt);
 const r=await fetch(url,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},
   body:JSON.stringify({data:state,updated_at:new Date().toISOString()})});
 if(!r.ok)throw Error('Supabase write failed: '+r.status+' '+(await r.text()).slice(0,100));
 return (await r.json()).length===1;
}
async function main(){
 const clock=amsterdamDate(),today=[clock.year,clock.month,clock.day].join('-');
 const hr=Number(clock.hour),day=clock.weekday.toLowerCase();
 if(!MANUAL&&(day!=='fri'||hr<19||hr>22)){
   console.log('Not Friday after 19:00 Europe/Amsterdam; skipping.');return;
 }
 const daysToSat=(6-new Date(today+'T12:00:00Z').getUTCDay()+7)%7||7;
 const target=MANUAL?datePlus(today,daysToSat):datePlus(today,1);
 for(let attempt=0;attempt<4;attempt++){
   const row=await fetchState(),s=row.data;
   if(!Array.isArray(s?.players)||!Array.isArray(s?.fixtures))throw Error('Shared state not initialized');
   const fixture=s.fixtures.find(f=>f.date===target);
   if(!fixture){console.log('No Saturday fixture found for '+target+'. Nothing changed.');return;}
   if(s.generated?.date===fixture.date&&s.generated?.opponent===fixture.opponent){
     console.log('Match plan already exists; no overwrite.');return;
   }
   const meeting=(hhmm)=>{const [h,m]=String(hhmm||'').split(':').map(Number);
     if(!Number.isFinite(h)||!Number.isFinite(m))return '';
     const value=(h*60+m-45+1440)%1440;
     return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
   };
   const previousMatch=s.match||{};
   const selected={...previousMatch,...fixture,
     meeting:fixture.meeting||meeting(fixture.kickoff),
     linesmanList:previousMatch.linesmanList||'',
     refereeList:previousMatch.refereeList||'',
     linesmanIndex:previousMatch.linesmanIndex||0,
     refereeIndex:previousMatch.refereeIndex||0};
   const proposed={...s,match:selected,week:(()=>{
     const d=new Date(fixture.date+'T12:00:00Z');
     d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);
   })()};
   let plan;
   try{plan=createPlan(proposed,selected,{source:'automatisch-vrijdag-19u'});}
   catch(err){
     // Do not save unusable lineups; preserve notes for manual repair.
     console.error('Cannot generate: '+err.message);process.exitCode=1;return;
   }
   proposed.generated=plan;
   if(DRY_RUN){console.log('DRY RUN: '+target+', '+Object.keys(plan.lineup).length+' starters, '
     +plan.swaps.map(x=>x.changes.length).join('/')+' substitutions; no write.');return;}
   if(await patchWithVersion(proposed,row.updated_at)){
     console.log('Published Friday match plan '+target+' with '+plan.swaps.length+' substitutions rounds.');return;
   }
   console.log('Concurrent change; retry '+(attempt+1));
 }
 throw Error('Concurrent updates prevented safely publishing the plan');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
