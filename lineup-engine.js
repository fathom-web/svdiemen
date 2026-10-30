/* Shared algorithm for JO16-3 browser and scheduled Friday task. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.JO163Engine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const FIELD=['RB','RCB','LCB','LB','RDM','LDM','CAM','RW','ST','LW'];
  const MOMENTS=[
    {time:20,label:'20 minuten 1e helft',description:'Na 20 minuten eerste helft'},
    {time:40,label:'RUST',description:'Rust na 40 minuten'},
    {time:60,label:'20 minuten 2e helft',description:'Na 20 minuten tweede helft'}
  ];
  function matchPeriodInfo(state){
    const half=state?.teamName==='JO14-3'?35:40;
    return {
      duration:half*2,
      periods:[20,half-20,20,half-20],
      moments:[{...MOMENTS[0]},{...MOMENTS[1],time:half,description:'Rust na '+half+' minuten'},
        {...MOMENTS[2],time:half+20}]
    };
  }
  function monday(date){
    const d=new Date(date+'T12:00:00Z');
    d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
    return d.toISOString().slice(0,10);
  }
  function keyOf(f){return String(f.date||'')+'|'+String(f.opponent||'');}
  function positions(p){return Array.isArray(p?.preferences)&&p.preferences.length?p.preferences:[p?.primary,p?.secondary].filter(Boolean);}
  function suitability(p,pos){
    const prefs=positions(p);
    if(pos==='GK')return prefs[0]==='GK'?190:-1000;
    if(prefs[0]==='GK')return -1000;
    const i=prefs.indexOf(pos);
    if(i<0)return -250;
    if(['RCB','LCB'].includes(pos)&&prefs.includes('RCB')&&prefs.includes('LCB'))return 150;
    return [150,115,83,55,30][Math.min(i,4)];
  }
  function training(state,p,week){
    const att=state.att||{};
    // Training attendance is opt-out. JO16-2 trains three days; other teams two.
    const days=state.teamName==='JO16-2'?['ma','wo','vr']:['di','do'];
    return days.reduce((sum,day)=>sum+(att[week+':'+day+':'+p.id]!=='no'?1:0),0);
  }
  function unavailable(state,match,p){
    const status=(state.matchAvailability||{})[keyOf(match)]?.[p.id];
    return Boolean(p.injured||status==='no'||status==='afwezig');
  }
  /* Rectangular max-weight Hungarian assignment: one distinct player per position. */
  function assignMax(scores){
    const n=scores.length;if(!n)return {score:0,columns:[]};
    const m=scores[0].length;
    if(m<n)throw Error('Onvoldoende spelers voor veldposities');
    const u=Array(n+1).fill(0),v=Array(m+1).fill(0);
    const p=Array(m+1).fill(0),way=Array(m+1).fill(0);
    for(let i=1;i<=n;i++){
      p[0]=i;let j0=0;
      const minv=Array(m+1).fill(Infinity),used=Array(m+1).fill(false);
      do{
        used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;
        for(let j=1;j<=m;j++)if(!used[j]){
          const cur=-scores[i0-1][j-1]-u[i0]-v[j];
          if(cur<minv[j]){minv[j]=cur;way[j]=j0;}
          if(minv[j]<delta){delta=minv[j];j1=j;}
        }
        for(let j=0;j<=m;j++){
          if(used[j]){u[p[j]]+=delta;v[j]-=delta;}
          else minv[j]-=delta;
        }
        j0=j1;
      }while(p[j0]!==0);
      do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0!==0);
    }
    const columns=Array(n).fill(-1);
    for(let j=1;j<=m;j++)if(p[j])columns[p[j]-1]=j-1;
    return {score:columns.reduce((sum,j,i)=>sum+scores[i][j],0),columns};
  }
  function initialLineup(state,match,available){
    const keeper=available.find(p=>positions(p)[0]==='GK');
    if(!keeper)throw Error('Geen beschikbare keeper: geef minstens één speler positie 1 (GK)');
    const others=available.filter(p=>p.id!==keeper.id&&positions(p)[0]!=='GK');
    if(others.length<10)throw Error('Minder dan elf spelers beschikbaar');
    const week=monday(match.date),avg=others.reduce((n,p)=>n+(p.minutes||0),0)/others.length;
    const scores=FIELD.map(pos=>others.map((p,i)=>
      suitability(p,pos)*3+training(state,p,week)*20-
      ((p.minutes||0)-avg)*.24-(p.starts||0)*3-i*.0001));
    const solution=assignMax(scores),lineup={GK:keeper.id};
    FIELD.forEach((pos,i)=>{lineup[pos]=others[solution.columns[i]].id});
    return lineup;
  }
  function replacements(onField,bench,minutes,state,week){
    const count=Math.min(FIELD.length,bench.length);
    if(!count)return [];
    const playerById=new Map(state.players.map(p=>[p.id,p]));
    const field=FIELD.filter(pos=>onField[pos]);
    let best={score:-Infinity,changes:[]};
    function consider(chosen){
      const matrix=bench.slice(0,count).map((incoming,i)=>chosen.map((pos,j)=>{
        const outgoing=playerById.get(onField[pos]);
        const incomingFit=suitability(incoming,pos);
        const outgoingFit=suitability(outgoing,pos);
        return incomingFit*2.1
          +(minutes[outgoing.id]-minutes[incoming.id])*4
          +((outgoing.minutes||0)-(incoming.minutes||0))*.04
          +(training(state,incoming,week)-training(state,outgoing,week))*7
          +(outgoingFit>=115&&incomingFit<0?-95:0)
          -i*.00001-j*.000001;
      }));
      const assignment=assignMax(matrix);
      if(assignment.score>best.score){
        best={score:assignment.score,changes:assignment.columns.map((c,i)=>({
          pos:chosen[c],out:onField[chosen[c]],in:bench[i].id
        }))};
      }
    }
    function enumerate(start,chosen){
      if(chosen.length===count){consider(chosen);return;}
      for(let i=start;i<=field.length-(count-chosen.length);i++){
        chosen.push(field[i]);enumerate(i+1,chosen);chosen.pop();
      }
    }
    enumerate(0,[]);
    return best.changes;
  }
  function calculateRotations(state,match,lineup,available){
    const keeper=lineup.GK,current={...lineup},mins=Object.fromEntries(available.map(p=>[p.id,0]));
    const week=monday(match.date),map=new Map(state.players.map(p=>[p.id,p]));
    const swaps=[],warnings=[],period=matchPeriodInfo(state);
    for(let stage=0;stage<4;stage++){
      for(const id of Object.values(current))mins[id]=(mins[id]||0)+period.periods[stage];
      if(stage===3)break;
      const playing=new Set(Object.values(current));
      const bench=available.filter(p=>p.id!==keeper&&!playing.has(p.id));
      const changes=replacements(current,bench,mins,state,week);
      for(const change of changes){
        const player=map.get(change.in);
        if(suitability(player,change.pos)<0)warnings.push(player.name+' staat op een niet-opgegeven positie: '+change.pos);
        current[change.pos]=change.in;
      }
      swaps.push({...period.moments[stage],changes});
    }
    return {swaps,minutes:mins,warnings:[...new Set(warnings)],duration:period.duration,rotationVersion:6};
  }
  function createPlan(state,match,options={}){
    if(!match?.date||!match?.opponent)throw Error('Geen wedstrijd geselecteerd');
    // Guest players are stored separately and are only available for selected fixtures.
    const activeIds=new Set((state.matchGuestIds||{})[keyOf(match)]||[]);
    const guests=(state.guestPlayers||[]).filter(p=>activeIds.has(p.id));
    const effectiveState={...state,players:[...(state.players||[]),...guests]};
    const available=effectiveState.players.filter(p=>!unavailable(state,match,p));
    if(available.length<11)throw Error('Minimaal elf beschikbare spelers nodig (inclusief eventuele gastspelers)');
    const lineup=options.lineup?{...options.lineup}:initialLineup(effectiveState,match,available);
    const ids=Object.values(lineup),valid=new Set(available.map(p=>p.id));
    if(ids.length!==11||new Set(ids).size!==11||ids.some(id=>!valid.has(id)))throw Error('Basiself bevat geen elf unieke beschikbare spelers');
    if(positions(state.players.find(p=>p.id===lineup.GK))[0]!=='GK')throw Error('Keeper mag niet worden gerouleerd');
    const rotations=calculateRotations(effectiveState,match,lineup,available);
    const m=state.match||{},lines=(m.linesmanList||'').split(',').map(x=>x.trim()).filter(Boolean);
    const refs=(m.refereeList||'').split(',').map(x=>x.trim()).filter(Boolean);
    return {
      date:match.date,opponent:match.opponent,lineup,
      ...rotations,
      linesman:state.teamName==='JO16-2'?'Niet van toepassing':(lines.length?lines[(m.linesmanIndex||0)%lines.length]:'Nog toewijzen'),
      referee:state.teamName==='JO16-2'?'Niet van toepassing':(match.home==='home'?(refs.length?refs[(m.refereeIndex||0)%refs.length]:'Nog toewijzen'):'Thuisvereniging'),
      created:options.created||new Date().toISOString(),source:options.source||'handmatig'
    };
  }
  /**
   * Four read-only lineup snapshots: kick-off followed by the three substitutions.
   * No database migration: calculate from the stored lineup and swaps every render.
   */
  function lineupSnapshots(g){
    if(!g?.lineup)return [];
    const current={...g.lineup};
    const phases=[{time:0,label:'Startopstelling',lineup:{...current},changes:[]}];
    for(const sw of (g.swaps||[]).slice(0,3)){
      for(const change of (sw.changes||[])){
        if(!change.pos||!change.in)continue;
        // A phase's position always contains the incoming player after a substitution.
        current[change.pos]=change.in;
      }
      phases.push({time:sw.time,label:sw.label||String(sw.time),lineup:{...current},changes:sw.changes||[]});
    }
    return phases;
  }
  return {createPlan,calculateRotations,lineupSnapshots,monday,keyOf,unavailable,suitability,MOMENTS,matchPeriodInfo};
});
