/* FootballForge - four-page printable PDF of the live match lineup and all substitutions.
   Deliberately dependency-free, no CDN, no server uploads.
   Each A4 page contains a full field and OUT/IN changes for one match phase.
*/
(function(root){
  'use strict';
  const PAGE_W=1240,PAGE_H=1754; // A4 portrait at approximately 150 dpi
  const PT_W=595.28,PT_H=841.89;
  const COLORS={navy:'#071932',navy2:'#0d2955',blue:'#247ef4',muted:'#a9c7e9',
    white:'#ffffff',green:'#0f664a',green2:'#155c43',mint:'#a8ffcb',
    red:'#ffbbca',line:'#b6f4db',light:'#eaf5ff'};
  const FIELD_LINES=[
    ['LW','ST','RW'],
    ['CAM'],
    ['LDM','RDM'],
    ['LB','LCB','RCB','RB'],
    ['GK']
  ];
  const LABEL={GK:'KEEPER',RB:'RB',RCB:'RCV',LCB:'LCV',LB:'LB',LDM:'CVM',RDM:'CVM',CAM:'10',RW:'RV',ST:'SP',LW:'LV'};
  const NUM={GK:1,RB:2,RCB:3,LCB:4,LB:5,LDM:6,RDM:8,CAM:10,RW:7,ST:9,LW:11};
  const MONTH=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

  function byId(players,id){return players.find(p=>String(p.id)===String(id))}
  function safe(value,limit=72){return String(value??'').replace(/\s+/g,' ').trim().slice(0,limit)}
  function dateLabel(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return 'Datum nog niet bekend';
    const [y,m,d]=value.split('-').map(Number);
    return d+' '+(MONTH[m-1]||'')+' '+y;
  }
  function rounded(c,x,y,w,h,r,color){
    c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();
  }
  function fit(c,text,width,initial=31,min=15){
    let size=initial;const value=safe(text,92);
    while(size>min){c.font='800 '+size+'px system-ui,Arial,sans-serif';if(c.measureText(value).width<=width)break;size-=1}
    return {text:value,size};
  }
  function centered(c,text,x,y,width,size,color='#ffffff',min=15){
    const f=fit(c,text,width,size,min);c.fillStyle=color;c.textAlign='center';
    c.font='800 '+f.size+'px system-ui,Arial,sans-serif';c.fillText(f.text,x,y);
  }
  function left(c,text,x,y,width,size,color='#ffffff',min=15){
    const f=fit(c,text,width,size,min);c.fillStyle=color;c.textAlign='left';
    c.font='800 '+f.size+'px system-ui,Arial,sans-serif';c.fillText(f.text,x,y);
  }
  function shirt(c,x,y,player,pos,isNew){
    // Conspicuous player names, pitch position and jersey number.
    c.save();c.shadowBlur=14;c.shadowColor='#00162faa';
    rounded(c,x-56,y-25,112,68,13,isNew?'#145e5a':'#092d53');
    c.restore();
    if(isNew){
      c.strokeStyle=COLORS.mint;c.lineWidth=3;
      c.strokeRect(x-56,y-25,112,68);
    }
    c.save();
    c.translate(x,y-37);c.fillStyle=isNew?'#a3ffcc':'#f4f9ff';
    c.beginPath();c.moveTo(-22,-14);c.lineTo(-13,-22);c.lineTo(-6,-18);
    c.lineTo(6,-18);c.lineTo(13,-22);c.lineTo(22,-14);c.lineTo(30,-2);
    c.lineTo(19,4);c.lineTo(17,0);c.lineTo(17,29);c.lineTo(-17,29);
    c.lineTo(-17,0);c.lineTo(-19,4);c.lineTo(-30,-2);c.closePath();c.fill();
    c.fillStyle='#0a3470';c.textAlign='center';c.font='900 23px system-ui,Arial,sans-serif';
    c.fillText(String(player?.number||NUM[pos]),0,14);
    c.restore();
    centered(c,player?.name||'?',x,y+5,104,19,'#ffffff',11);
    centered(c,LABEL[pos]||pos,x,y+30,104,12,isNew?'#abffd0':'#afd0f9',10);
  }
  function drawField(c,phase,players){
    const x=80,y=355,w=1080,h=790;
    rounded(c,x,y,w,h,26,COLORS.green);
    c.save();c.beginPath();c.roundRect(x,y,w,h,26);c.clip();
    for(let k=0;k<8;k++){c.fillStyle=k%2===0?COLORS.green:COLORS.green2;c.fillRect(x,y+k*h/8,w,h/8)}
    c.restore();
    c.strokeStyle='#e4fff6a6';c.lineWidth=3;
    c.strokeRect(x+26,y+26,w-52,h-52);
    c.beginPath();c.moveTo(x+26,y+h/2);c.lineTo(x+w-26,y+h/2);
    c.stroke();
    c.beginPath();c.arc(x+w/2,y+h/2,93,0,Math.PI*2);c.stroke();
    c.strokeRect(x+290,y+26,w-580,125);
    c.strokeRect(x+290,y+h-151,w-580,125);
    c.strokeRect(x+410,y+26,w-820,54);
    c.strokeRect(x+410,y+h-80,w-820,54);
    const rowY=[y+135,y+260,y+386,y+532,y+669];
    const entering=new Set((phase.changes||[]).map(ch=>String(ch.in)));
    for(let i=0;i<FIELD_LINES.length;i++){
      const positions=FIELD_LINES[i],count=positions.length;
      for(let j=0;j<count;j++){
        const px=x+w*(j+1)/(count+1);
        const pos=positions[j],player=byId(players,phase.lineup[pos]);
        shirt(c,px,rowY[i],player,pos,entering.has(String(phase.lineup[pos])));
      }
    }
  }
  function stageName(index,phase){
    const names=['STARTOPSTELLING','20 MINUTEN 1E HELFT','RUST / START 2E HELFT','20 MINUTEN 2E HELFT'];
    return names[index]||safe(phase.label);
  }
  function drawPhasePage(canvas,options,phase,index){
    canvas.width=PAGE_W;canvas.height=PAGE_H;
    const c=canvas.getContext('2d');
    if(!c)throw Error('Canvas niet beschikbaar');
    c.fillStyle='#071427';c.fillRect(0,0,PAGE_W,PAGE_H);
    const grad=c.createLinearGradient(0,0,PAGE_W,PAGE_H);
    grad.addColorStop(0,'#123970');grad.addColorStop(.48,'#091d3c');
    grad.addColorStop(1,'#061326');
    c.fillStyle=grad;c.fillRect(0,0,PAGE_W,335);
    c.fillStyle='#a9ceff';c.font='900 25px system-ui,Arial,sans-serif';c.textAlign='left';
    c.fillText('FOOTBALL',80,89);
    c.fillStyle='#5bafff';c.fillText('FORGE',237,89);
    c.font='800 17px system-ui,Arial,sans-serif';c.fillStyle='#9ebfe7';
    c.fillText('SV DIEMEN  ·  '+safe(options.teamName,26).toUpperCase(),80,124);
    rounded(c,1016,61,145,58,14,'#204c86');
    centered(c,'FASE 0'+(index+1),1088,99,134,22,'#f6fbff');
    left(c,stageName(index,phase),80,201,1080,48,'#ffffff',29);
    left(c,safe(options.match.opponent||'Tegenstander nog niet ingevuld',75),80,248,1050,27,'#c9e1ff',17);
    const details=[
      dateLabel(options.match.date),
      'AFTRAP '+(options.match.kickoff||'--:--'),
      'VERZAMELEN '+(options.match.meeting||'--:--')
    ];
    let xx=80;for(const detail of details){
      const size=Math.min(375,Math.max(230,detail.length*14+34));
      rounded(c,xx,277,size,42,11,'#254873');
      centered(c,detail,xx+size/2,305,size-17,17,'#e4f1ff',12);
      xx+=size+12;
    }
    drawField(c,phase,options.players);
    c.font='900 30px system-ui,Arial,sans-serif';c.fillStyle='#edf7ff';c.textAlign='left';
    c.fillText(index===0?'BASISELF':'WISSELS  ·  WIE GAAT ERUIT EN WIE KOMT ERIN',80,1204);
    c.fillStyle='#3674b2';c.fillRect(80,1220,1080,2);
    const changes=phase.changes||[];
    if(!changes.length){
      rounded(c,80,1251,1080,92,15,'#102c50');
      left(c,'Geen wissels · dit is de startopstelling.',108,1310,1005,28,'#bfdaff',18);
    }else{
      const rowHeight=Math.min(73,Math.max(38,365/changes.length));
      for(let i=0;i<changes.length;i++){
        const ch=changes[i],out=byId(options.players,ch.out),incoming=byId(options.players,ch.in);
        const top=1240+i*rowHeight;
        rounded(c,80,top,1080,rowHeight-5,11,i%2===0?'#102b4d':'#0c2444');
        c.fillStyle='#ffb4c7';c.font='900 15px system-ui,Arial,sans-serif';c.fillText('UIT',108,top+24);
        c.fillStyle='#8affbd';c.fillText('IN',600,top+24);
        left(c,(out?.number?'#'+out.number+'  ':'')+(out?.name||'?'),160,top+rowHeight*.68,365,26,'#fff0f3',15);
        centered(c,'→',546,top+rowHeight*.68,60,31,'#82b4f8');
        left(c,(incoming?.number?'#'+incoming.number+'  ':'')+(incoming?.name||'?'),646,top+rowHeight*.68,340,26,'#cbffe0',15);
        rounded(c,1017,top+13,114,rowHeight-28,9,'#1b4578');
        centered(c,LABEL[ch.pos]||ch.pos,1074,top+rowHeight*.64,104,16,'#e6f3ff',11);
      }
    }
    // Footer retains location and staff without limiting change-row capacity.
    c.fillStyle='#204574';c.fillRect(80,1643,1080,2);
    left(c,'LOCATIE  '+safe(options.match.venue||'Wordt bekendgemaakt',48),80,1684,880,20,'#bad6fa',13);
    if(options.match.field)left(c,'VELD  '+safe(options.match.field,18),975,1684,185,19,'#bad6fa',13);
    c.font='800 17px system-ui,Arial,sans-serif';c.fillStyle='#7da5d5';
    c.fillText('FOOTBALLFORGE  ·  TRAINERSOVERZICHT',80,1724);
    c.textAlign='right';c.fillText((index+1)+' / 4',1160,1724);
    return canvas;
  }
  function decodeJPEG(dataUrl){
    const b64=dataUrl.split(',')[1];
    if(!b64)throw Error('Kon pagina niet omzetten naar afbeelding');
    const binary=atob(b64),bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return bytes;
  }
  function buildPDF(images){
    // JPEG images remain compressed in the PDF; the PDF is created locally.
    const enc=new TextEncoder(),parts=[],offsets=[0];let size=0;
    const push=part=>{const bytes=typeof part==='string'?enc.encode(part):part;parts.push(bytes);size+=bytes.length;};
    push('%PDF-1.4\n%\xC2\xA5\xC2\xB1\n');
    function obj(id,body,stream){
      offsets[id]=size;
      push(id+' 0 obj\n'+body);
      if(stream){push('\nstream\n');push(stream);push('\nendstream');}
      push('\nendobj\n');
    }
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
    const ids=images.map((_,i)=>3+i*3);
    obj(2,'<< /Type /Pages /Kids ['+ids.map(id=>id+' 0 R').join(' ')+'] /Count '+images.length+' >>');
    for(let i=0;i<images.length;i++){
      const id=ids[i],img=images[i],pageName='Im'+i;
      obj(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PT_W+' '+PT_H+'] /Resources << /XObject << /'+pageName+' '+(id+2)+' 0 R >> >> /Contents '+(id+1)+' 0 R >>');
      const content='q\n'+PT_W+' 0 0 '+PT_H+' 0 0 cm\n/'+pageName+' Do\nQ\n';
      obj(id+1,'<< /Length '+enc.encode(content).length+' >>',enc.encode(content));
      obj(id+2,'<< /Type /XObject /Subtype /Image /Width '+PAGE_W+' /Height '+PAGE_H+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+img.length+' >>',img);
    }
    const xref=size,total=2+images.length*3;
    push('xref\n0 '+(total+1)+'\n0000000000 65535 f \n');
    for(let id=1;id<=total;id++)push(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
    push('trailer\n<< /Size '+(total+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
    return new Blob(parts,{type:'application/pdf'});
  }
  async function download(options){
    if(!options?.match?.date||!options?.match?.opponent)throw Error('Selecteer eerst een wedstrijd');
    if(!Array.isArray(options.phases)||options.phases.length!==4)throw Error('Genereer eerst de vier opstellingen');
    if(!Array.isArray(options.players))throw Error('Spelers ontbreken');
    const canvas=document.createElement('canvas'),images=[];
    for(let i=0;i<4;i++){
      drawPhasePage(canvas,options,options.phases[i],i);
      images.push(decodeJPEG(canvas.toDataURL('image/jpeg',.9)));
      await new Promise(resolve=>setTimeout(resolve,0)); // remain responsive while generating pages
    }
    const blob=buildPDF(images);
    const link=document.createElement('a'),url=URL.createObjectURL(blob);
    const file='FootballForge-'+safe(options.teamName||'Team').replace(/[^a-z0-9-]/gi,'-')
      +'-'+options.match.date+'-wisselschema.pdf';
    try{
      link.href=url;link.download=file;
      document.body.appendChild(link);link.click();link.remove();
    }finally{
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    }
    return {name:file,pages:4,size:blob.size};
  }
  root.FootballForgePDF={download,drawPhasePage,buildPDF};
})(typeof globalThis!=='undefined'?globalThis:this);
