'use strict';
/*
 * FootballForge scheduled Friday match plan.
 * The row is shared: JO16-3 lives at root, other teams in footballforgeTeams.
 * Every write uses a timestamp compare-and-swap to avoid losing concurrent changes.
 */
const {createPlan,monday}=require('../lineup-engine.js');
const BASE=process.env.SUPABASE_URL,KEY=process.env.SUPABASE_PUBLISHABLE_KEY;
if(!BASE||!KEY)throw Error('Supabase configuration missing');
const DRY_RUN=process.env.DRY_RUN==='true';
const MANUAL=process.env.GITHUB_EVENT_NAME==='workflow_dispatch';
const ENDPOINT=BASE.replace(/\/$/,'')+'/rest/v1/jo163_app_state';
const headers={'apikey':KEY,'Content-Type':'application/json'};
const teams=[{id:'jo16-3',name:'JO16-3'},{id:'jo16-2',name:'JO16-2'},{id:'jo14-3',name:'JO14-3'}];
function localClock(){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Amsterdam',
  year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',
  hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
 return Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
}
function addDays(date,days){
 const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);
 return d.toISOString().slice(0,10);
}
function meetingBefore(hhmm){
 if(!/^\d{2}:\d{2}$/.test(hhmm||''))return '';
 const [h,m]=hhmm.split(':').map(Number),value=(h*60+m-45+1440)%1440;
 return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
}
async function fetchState(){
 const res=await fetch(ENDPOINT+'?select=data,updated_at&id=eq.1',{headers});
 if(!res.ok)throw Error('Supabase read HTTP '+res.status);
 const rows=await res.json();
 if(rows.length!==1)throw Error('Supabase state row missing');
 return rows[0];
}
async function updateIfUnchanged(data,updatedAt){
 const res=await fetch(ENDPOINT+'?id=eq.1&updated_at=eq.'+encodeURIComponent(updatedAt),{
  method:'PATCH',headers:{...headers,Prefer:'return=representation'},
  body:JSON.stringify({data,updated_at:new Date().toISOString()})
 });
 if(!res.ok)throw Error('Supabase update HTTP '+res.status+': '+(await res.text()).slice(0,100));
 return (await res.json()).length===1;
}
function prepare(root,day,log){
 let changed=false;
 const result={...root,footballforgeTeams:{...(root.footballforgeTeams||{})}};
 for(const team of teams){
  const s=team.id==='jo16-3'?root:root.footballforgeTeams?.[team.id];
  if(!Array.isArray(s?.players)||!Array.isArray(s?.fixtures)){
   log.push(team.name+': no initialized team; skipped');
   continue;
  }
  const match=s.fixtures.find(f=>f.date===day);
  if(!match){log.push(team.name+': no Saturday fixture; skipped');continue;}
  if(s.generated?.date===match.date&&s.generated?.opponent===match.opponent){
   log.push(team.name+': plan already exists; unchanged');continue;
  }
  const selected={...s.match,...match,
    meeting:match.meeting||meetingBefore(match.kickoff),
    linesmanList:s.match?.linesmanList||'',
    refereeList:s.match?.refereeList||'',
    linesmanIndex:s.match?.linesmanIndex||0,
    refereeIndex:s.match?.refereeIndex||0};
  const proposed={...s,teamName:team.name,match:selected,week:monday(match.date)};
  try{
   const plan=createPlan(proposed,selected,{source:'automatisch-vrijdag-11u'});
   proposed.generated=plan;
   if(team.id==='jo16-3'){
     Object.assign(result,proposed);
     result.footballforgeTeams={...(root.footballforgeTeams||{})};
   }else result.footballforgeTeams[team.id]=proposed;
   changed=true;
   log.push(team.name+': prepared '+match.date+' ('+plan.duration+' min, '+plan.swaps.map(x=>x.changes.length).join('/')+' changes)');
  }catch(e){
   log.push(team.name+': unable to generate ('+e.message+'); current team data preserved');
  }
 }
 return {changed,data:result,log};
}
async function main(){
 const c=localClock(),day=[c.year,c.month,c.day].join('-');
 const hour=Number(c.hour),minute=Number(c.minute);
 if(!MANUAL&&(c.weekday.toLowerCase()!=='fri'||hour<11||hour>12)){
  console.log('Not Friday 11:00–12:59 Europe/Amsterdam; skipping');return;
 }
 const days=(6-new Date(day+'T12:00:00Z').getUTCDay()+7)%7||7;
 const target=MANUAL?addDays(day,days):addDays(day,1);
 for(let attempt=0;attempt<5;attempt++){
  const row=await fetchState();
  const notes=[];
  const {changed,data}=prepare(row.data||{},target,notes);
  notes.forEach(line=>console.log(line));
  if(!changed){console.log('No changes required');return;}
  if(DRY_RUN){console.log('DRY RUN: no database updates');return;}
  if(await updateIfUnchanged(data,row.updated_at)){
   console.log('Saved FootballForge Friday 11:00 plans with conflict protection');return;
  }
  console.log('Concurrent change; refreshed state and retrying ('+(attempt+1)+')');
 }
 throw Error('Could not save plans due to concurrent changes; no data overwritten');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
