/* Parent announcement and shareable matchday poster for JO16-3.
   Only public match facts. Weather from Open-Meteo if within forecast horizon. */
(function(root){
  "use strict";
  const PALETTE={navy:"#06152f",navy2:"#102c64",blue:"#1777f4",light:"#d3e9ff",white:"#ffffff",muted:"#9ab9df"};
  function matchInfo(state){return state?.match||{};}
  function formatDate(d){if(!d)return "Datum volgt";return new Date(d+"T12:00:00").toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long",year:"numeric"});}
  function mapsUrl(m){const venue=String(m?.venue||"").trim();if(!venue)return "";return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(venue+", Nederland");}
  function officials(state){
    const m=matchInfo(state),g=state?.generated;
    const matching=g&&g.date===m.date&&g.opponent===m.opponent;
    const line=(m.linesmanList||"").split(",").map(x=>x.trim()).filter(Boolean);
    const refs=(m.refereeList||"").split(",").map(x=>x.trim()).filter(Boolean);
    return {
      linesman:matching?g.linesman:(line.length?line[(m.linesmanIndex||0)%line.length]:"Nog niet bekend"),
      referee:m.home==="home"?(matching?g.referee:(refs.length?refs[(m.refereeIndex||0)%refs.length]:"Nog niet bekend")):"Thuisvereniging"
    };
  }
  function weatherCode(code){
    if(code===0)return "Zonnig";
    if(code<=3)return "Halfbewolkt";
    if(code===45||code===48)return "Mistig";
    if(code>=51&&code<=67)return "Regen of motregen";
    if(code>=71&&code<=77)return "Sneeuw";
    if(code>=80&&code<=82)return "Buien";
    if(code>=95)return "Onweer";
    return "Wisselvallig";
  }
  const VENUE_CITIES=[
    [/sportpark diemen|diemen/i,"Diemen"],
    [/papelaan|weesp/i,"Weesp"],
    [/overburg|martinus/i,"Amstelveen"],
    [/buiksloterbanne|volewijckers/i,"Amsterdam"],
    [/amsterdam/i,"Amsterdam"],
    [/ouderkerk/i,"Ouderkerk aan de Amstel"]
  ];
  function cityOf(m){
    const venue=String(m?.venue||"");
    for(const [pattern,city] of VENUE_CITIES)if(pattern.test(venue))return city;
    return m?.home==="home"?"Diemen":null;
  }
  async function getWeather(m){
    const city=cityOf(m);
    if(!city||!m?.date)return null;
    const now=new Date(),target=new Date(m.date+"T12:00:00");
    const days=(target-now)/86400000;
    if(days < -1 || days > 15)return null;
    const geourl="https://geocoding-api.open-meteo.com/v1/search?"+new URLSearchParams({name:city,count:"5",language:"nl",format:"json",countryCode:"NL"});
    const geo=await fetch(geourl).then(r=>{if(!r.ok)throw Error("Geen locatie");return r.json()});
    const loc=(geo.results||[]).find(x=>x.country_code==="NL");
    if(!loc)return null;
    const weatherUrl="https://api.open-meteo.com/v1/forecast?"+new URLSearchParams({latitude:String(loc.latitude),longitude:String(loc.longitude),daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",timezone:"Europe/Amsterdam",forecast_days:"16"});
    const forecast=await fetch(weatherUrl).then(r=>{if(!r.ok)throw Error("Weer niet beschikbaar");return r.json()});
    const idx=(forecast.daily?.time||[]).indexOf(m.date);
    if(idx<0)return null;
    const daily=forecast.daily;
    const degrees=Number(daily.temperature_2m_max[idx]);
    const rain=Number(daily.precipitation_probability_max[idx]);
    return {label:weatherCode(daily.weather_code[idx]),temperature:Number.isFinite(degrees)?Math.round(degrees):null,rain:Number.isFinite(rain)?Math.round(rain):null,source:"Open-Meteo",date:m.date,city};
  }
  function weatherLine(weather){
    if(!weather)return null;
    const bits=[weather.label];
    if(weather.temperature!==null)bits.push(weather.temperature+"°C max");
    if(weather.rain!==null)bits.push(weather.rain+"% kans op neerslag");
    return bits.join(" · ");
  }
  function makeMessage(state,weather){
    const m=matchInfo(state);
    if(!m.date||!m.opponent)return "Selecteer eerst een wedstrijd om de aankondiging te maken.";
    const home=m.home==="home",opp=String(m.opponent).trim(),of=officials(state);
    const lines=[
      "*SV DIEMEN JO16-3 | MATCHDAY*",
      "",
      home?"*SV Diemen JO16-3 – "+opp+"*":"*"+opp+" – SV Diemen JO16-3*",
      home?"Thuiswedstrijd":"Uitwedstrijd",
      "",
      "Datum: "+formatDate(m.date),
      "Aftrap: "+(m.kickoff||"Nog niet bekend")+" uur",
      "Verzamelen: "+(m.meeting||"Nog niet bekend")+" uur",
      "Locatie: "+(m.venue||"Nog niet bekend")
    ];
    if(m.field)lines.push("Veld: "+m.field);
    if(mapsUrl(m))lines.push("Route via Google Maps:\n"+mapsUrl(m));
    if(weatherLine(weather))lines.push("\nWeersverwachting: "+weatherLine(weather)+" (bron: Open-Meteo)");
    lines.push("","Grensrechter: "+of.linesman);
    if(home)lines.push("Scheidsrechter: "+of.referee);
    if(m.parentNote?.trim())lines.push("","\uD83D\uDCCC "+m.parentNote.trim());
    lines.push("","Zorg dat je op tijd bent, neem je spullen mee en meld onverwachte afwezigheid direct bij de trainers.","","*Tot zaterdag!*\nSiam, Melcher & Rob");
    return lines.join("\n");
  }
  function wrap(ctx,str,maxWidth){
    const words=String(str||"").split(/\s+/),lines=[];let line="";
    for(const word of words){const candidate=line?line+" "+word:word;
      if(ctx.measureText(candidate).width>maxWidth&&line){lines.push(line);line=word;}else line=candidate;
    }
    if(line)lines.push(line);
    return lines;
  }
  function rounded(ctx,x,y,w,h,r,fill,stroke){
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.lineWidth=2;ctx.strokeStyle=stroke;ctx.stroke();}
  }
  function drawPoster(canvas,state,weather,logos=[]){
    const m=matchInfo(state),ctx=canvas.getContext("2d"),W=1080,H=1350;
    canvas.width=W;canvas.height=H;
    const bg=ctx.createLinearGradient(0,0,1080,1350);
    bg.addColorStop(0,"#0c3269");bg.addColorStop(.45,"#071936");bg.addColorStop(1,"#061329");
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="#6ab5ff1b";ctx.lineWidth=3;
    [250,340,430].forEach(radius=>{ctx.beginPath();ctx.arc(960,160,radius,0,Math.PI*2);ctx.stroke()});
    rounded(ctx,56,49,968,114,28,"#ffffff0d","#679de444");
    ctx.fillStyle="#ffffff";ctx.font="900 40px system-ui,sans-serif";ctx.fillText("SV DIEMEN",92,102);
    ctx.fillStyle="#a3caff";ctx.font="750 23px system-ui,sans-serif";ctx.fillText("JO16-3  /  TEAM MANAGER",94,136);
    ctx.textAlign="center";
    rounded(ctx,56,186,968,460,32,"#15509b","#4381d5");
    ctx.fillStyle="#bbddff";ctx.font="750 26px system-ui,sans-serif";
    ctx.fillText(m.home==="home"?"THUISWEDSTRIJD":"UITWEDSTRIJD",540,230);
    ctx.fillStyle="#ffffff";ctx.font="1000 70px system-ui,sans-serif";ctx.fillText("MATCHDAY",540,317);
    const teams=m.home==="home"?["SV DIEMEN JO16-3",m.opponent||"TEGENSTANDER"]:[m.opponent||"TEGENSTANDER","SV DIEMEN JO16-3"];
    function badge(cx,cy,logo,name){
      ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(cx,cy,95,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.beginPath();ctx.arc(cx,cy,87,0,Math.PI*2);ctx.clip();
      if(logo&&logo.naturalWidth&&logo.naturalHeight){
        const scale=Math.min(162/logo.naturalWidth,162/logo.naturalHeight);
        const iw=logo.naturalWidth*scale,ih=logo.naturalHeight*scale;
        ctx.drawImage(logo,cx-iw/2,cy-ih/2,iw,ih);
      }else{
        ctx.fillStyle="#1261c8";ctx.fillRect(cx-88,cy-88,176,176);
        ctx.fillStyle="#ffffff";ctx.font="900 41px system-ui,sans-serif";
        const abbr=(typeof JO163Logos!=='undefined')?JO163Logos.initials(name):String(name).slice(0,3).toUpperCase();
        ctx.fillText(abbr,cx,cy+14);
      }
      ctx.restore();
    }
    badge(312,445,logos[0],teams[0]);badge(768,445,logos[1],teams[1]);
    ctx.font="850 32px system-ui,sans-serif";ctx.fillStyle="#bfdbff";ctx.fillText("VS",540,453);
    teams.forEach((name,i)=>{
      const x=i?768:312;
      ctx.fillStyle="#ffffff";ctx.font="850 27px system-ui,sans-serif";
      wrap(ctx,String(name).toUpperCase(),370).slice(0,2).forEach((line,k)=>ctx.fillText(line,x,575+k*32));
    });
    rounded(ctx,56,664,968,62,17,"#214b80");
    ctx.fillStyle="#e8f5ff";ctx.font="800 28px system-ui,sans-serif";
    ctx.fillText(formatDate(m.date).toUpperCase(),540,704);
    const card=(x,y,width,height,title,value,large=false)=>{
      rounded(ctx,x,y,width,height,23,"#123763","#3d72ac");
      ctx.fillStyle="#a9d0fc";ctx.font="750 21px system-ui,sans-serif";ctx.fillText(title,x+width/2,y+38);
      ctx.fillStyle="#ffffff";ctx.font=(large?"900 55px":"850 31px")+" system-ui,sans-serif";
      const max=width-45;const lines=wrap(ctx,String(value),max);
      lines.slice(0,2).forEach((ln,i)=>ctx.fillText(ln,x+width/2,y+(large?106:87)+i*37));
    };
    card(56,746,473,133,"AFTRAP",m.kickoff||"--:--",true);
    card(550,746,474,133,"VERZAMELEN",m.meeting||"--:--",true);
    card(56,893,732,134,"SPORTPARK",m.venue||"Locatie volgt");
    card(805,893,219,134,"VELD",m.field||"Nog niet bekend");
    const of=officials(state);
    card(56,1042,473,134,"GRENSRECHTER",of.linesman);
    card(550,1042,474,134,"SCHEIDSRECHTER",m.home==="home"?of.referee:"Gastvereniging");
    rounded(ctx,56,1190,968,112,18,"#071d3b","#2a5a92");
    ctx.fillStyle="#a7cfff";ctx.font="700 20px system-ui,sans-serif";
    ctx.fillText("WEER & PRAKTISCHE INFO",540,1223);
    ctx.fillStyle="#ffffff";ctx.font="680 20px system-ui,sans-serif";
    const forecast=weatherLine(weather)||"Weersverwachting nog niet beschikbaar";
    ctx.fillText(forecast,540,1254);
    if(m.parentNote?.trim()){
      ctx.fillStyle="#b6d6ff";ctx.font="620 17px system-ui,sans-serif";
      const note=String(m.parentNote).replace(/\s+/g,' ').slice(0,120);
      ctx.fillText(note.length<112?note:note.slice(0,109)+"…",540,1281);
    }else{
      ctx.fillStyle="#78a8dc";ctx.font="600 17px system-ui,sans-serif";
      ctx.fillText("Google Maps-route staat in het WhatsApp-bericht",540,1281);
    }
    ctx.fillStyle="#90b8e8";ctx.font="800 20px system-ui,sans-serif";
    ctx.fillText("SIAM  ·  MELCHER  ·  ROB    /    SV DIEMEN JO16-3",540,1337);
    ctx.textAlign="start";
    return canvas;
  }
  root.JO163Parent={makeMessage,mapsUrl,weatherLine,getWeather,drawPoster,formatDate};
})(typeof globalThis!=="undefined"?globalThis:this);
