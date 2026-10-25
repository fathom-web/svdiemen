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
  function drawPoster(canvas,state,weather){
    const m=matchInfo(state),ctx=canvas.getContext("2d"),w=1080,h=1350;
    canvas.width=w;canvas.height=h;
    let bg=ctx.createLinearGradient(0,0,960,1350);bg.addColorStop(0,"#09275a");bg.addColorStop(.52,PALETTE.navy);bg.addColorStop(1,"#081b3f");
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle="#74b6ff20";ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(950,120,350,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(950,120,280,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(950,120,215,0,Math.PI*2);ctx.stroke();
    rounded(ctx,65,70,950,120,30,"#ffffff0b","#ffffff32");
    ctx.fillStyle=PALETTE.white;ctx.font="900 39px system-ui, sans-serif";ctx.fillText("SV DIEMEN",100,125);
    ctx.fillStyle="#92bdff";ctx.font="750 23px system-ui, sans-serif";ctx.fillText("JO16-3  ·  TEAM MANAGER",102,158);
    rounded(ctx,65,225,950,680,38,"#104187","#4e95eb");
    ctx.textAlign="center";ctx.fillStyle="#b6d5ff";ctx.font="800 30px system-ui,sans-serif";
    ctx.fillText(m.home==="home"?"THUISWEDSTRIJD":"UITWEDSTRIJD",540,300);
    ctx.fillStyle="#ffffff";ctx.font="900 82px system-ui,sans-serif";ctx.fillText("MATCHDAY",540,408);
    ctx.fillStyle="#87baff";ctx.font="700 30px system-ui,sans-serif";ctx.fillText("ZATERDAG VOETBAL",540,458);
    const teams=m.home==="home"?["SV DIEMEN",String(m.opponent||"TEGENSTANDER")]:[String(m.opponent||"TEGENSTANDER"),"SV DIEMEN"];
    let y=568;for(let i=0;i<teams.length;i++){ctx.fillStyle="#ffffff";ctx.font="850 44px system-ui,sans-serif";
      const words=wrap(ctx,teams[i].toUpperCase(),815);for(const line of words.slice(0,2)){ctx.fillText(line,540,y);y+=56}
      if(i===0){ctx.fillStyle="#97ccff";ctx.font="700 29px system-ui,sans-serif";ctx.fillText("VS",540,y+2);y+=68}
    }
    ctx.fillStyle="#c4e2ff";ctx.font="700 29px system-ui,sans-serif";ctx.fillText(formatDate(m.date),540,825);
    const cards=[["AFTRAP",m.kickoff||"--:--"],["VERZAMELEN",m.meeting||"--:--"]];
    cards.forEach((c,i)=>{const x=65+i*485;rounded(ctx,x,930,465,165,24,"#133567","#4677ab");
      ctx.fillStyle="#9bc6f9";ctx.font="700 24px system-ui,sans-serif";ctx.textAlign="center";ctx.fillText(c[0],x+232,980);
      ctx.fillStyle=PALETTE.white;ctx.font="900 64px system-ui,sans-serif";ctx.fillText(c[1],x+232,1055)});
    rounded(ctx,65,1120,950,150,22,"#0e2b58","#366898");
    ctx.fillStyle="#afd1fb";ctx.font="750 23px system-ui,sans-serif";ctx.fillText("LOCATIE",540,1162);
    ctx.fillStyle="#ffffff";ctx.font="800 35px system-ui,sans-serif";
    let locationLines=wrap(ctx,m.venue||"Locatie volgt",870);
    locationLines.slice(0,2).forEach((ln,i)=>ctx.fillText(ln,540,1210+i*40));
    if(weatherLine(weather)){ctx.fillStyle="#a6cfff";ctx.font="600 20px system-ui,sans-serif";ctx.fillText("WEER: "+weatherLine(weather),540,1314)}
    else {ctx.fillStyle="#7aa6d4";ctx.font="600 20px system-ui,sans-serif";ctx.fillText("SV DIEMEN JO16-3 · SAMEN STERK",540,1314)}
    ctx.textAlign="start";
    return canvas;
  }
  root.JO163Parent={makeMessage,mapsUrl,weatherLine,getWeather,drawPoster,formatDate};
})(typeof globalThis!=="undefined"?globalThis:this);
