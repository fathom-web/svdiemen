/* Verified public club crests. Custom overrides are kept in shared state.
   Remote images are optional; only CORS-clean assets are placed into a downloadable canvas. */
(function(root){
  'use strict';
  const SOURCES=[
    {test:/dijk/i,url:'https://images.seeklogo.com/logo-png/34/1/asv-de-dijk-logo-png_seeklogo-346695.png'},
    {test:/weesp/i,url:'https://website.storage/Data/Weesp/RTE/Bestanden/MenuItem/220/FC-Weesp-logo-2023-RGB.png'},
    {test:/sporting martinus/i,url:'https://www.hollandsevelden.nl/images/club_logo_van_voetbalvereniging_sporting-martinus_oud_uit_amstelveen.png'},
    {test:/volewijckers/i,url:'https://images.seeklogo.com/logo-png/52/1/asc-de-volewijckers-logo-png_seeklogo-529429.png'}
  ];
  const HOME_LOGO='https://cdn.eyecons.com/back-end/channels/logos/Uy6SyFzKKAdTDsrweTFDTn7s90E3xuoMNj94SfxJ.jpg';
  const cache=new Map();
  function logoUrl(name,state){
    const isHome=/^(sv\s*)?diemen/i.test(String(name));
    const own=state?.clubLogos||{};
    if(isHome&&own.diemen)return own.diemen;
    if(own[String(name)])return own[String(name)];
    if(isHome)return HOME_LOGO;
    const match=SOURCES.find(s=>s.test.test(String(name||'')));
    return match?match.url:'';
  }
  function opponentName(state){return state?.match?.opponent||''}
  function initials(label){
    const words=String(label||'CLUB').replace(/\b(o16|jo16|team)\S*/ig,'').trim().split(/\s+/);
    return words.length===1?words[0].slice(0,3).toUpperCase():words.slice(0,2).map(w=>w.charAt(0)).join('').toUpperCase();
  }
  function getImage(src){
    if(!src)return Promise.resolve(null);
    if(cache.has(src))return cache.get(src);
    const promise=new Promise(resolve=>{
      const img=new Image();img.crossOrigin='anonymous';let done=false;
      const finish=value=>{if(done)return;done=true;clearTimeout(timeout);resolve(value)};
      const timeout=setTimeout(()=>finish(null),5500);
      img.onload=()=>finish(img);img.onerror=()=>finish(null);img.src=src;
    });
    cache.set(src,promise);return promise;
  }
  async function drawAssets(state){
    const m=state.match||{};
    const [home,away]=await Promise.all([
      getImage(logoUrl('SV Diemen',state)),
      getImage(logoUrl(opponentName(state),state))
    ]);
    return m.home==='home'?[home,away]:[away,home];
  }
  function imageHtml(name,state,cssClass='team-crest'){
    const url=logoUrl(name,state),initial=initials(name);
    const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return '<span class="'+cssClass+'" role="img" aria-label="Logo '+esc(name)+'"><span class="crest-fallback">'+esc(initial)+'</span>'+(url?'<img loading="lazy" src="'+esc(url)+'" alt="" onerror="this.remove()" onload="this.previousElementSibling.remove()">':'')+'</span>';
  }
  root.JO163Logos={logoUrl,initials,getImage,drawAssets,imageHtml,HOME_LOGO};
})(typeof globalThis!=='undefined'?globalThis:this);
