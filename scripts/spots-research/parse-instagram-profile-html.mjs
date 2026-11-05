const decode = s => s.replace(/&quot;/g,'"').replace(/&#(?:39|x27);/gi,"'").replace(/&amp;/g,'&')
  .replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => {
    const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);
    return c<=0x10ffff?String.fromCodePoint(c):'';
  });
export function parseProfile(html, username) {
  const meta=Object.fromEntries([...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag])=>{
    const a=Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(m=>[m[1].toLowerCase(),decode(m[3])]));
    return [a.property||a.name,a.content];
  }));
  const exact=new RegExp(`^(.+?)\\s*\\(@${username.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\)(?:\\s|$)`,'i');
  const titleName=(meta['og:title']||'').match(exact)?.[1]?.trim()||null;
  const users=[];
  let visited=0;
  const walk=(value,depth=0)=>{
    if(depth>70 || ++visited>150000)return;
    if(typeof value==='string' && depth<60 && /^[\[{]/.test(value)) {
      try{walk(JSON.parse(value),depth+1);}catch{}return;
    }
    if(!value||typeof value!=='object')return;
    if(value.username?.toLowerCase?.()===username.toLowerCase())users.push(value);
    for(const child of Object.values(value))walk(child,depth+1);
  };
  for(const [,tag,body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if(!/type\s*=\s*["']application\/(?:ld\+)?json["']/i.test(tag))continue;
    try{walk(JSON.parse(body));}catch{}
  }
  users.sort((a,b)=>Number(typeof b.biography==='string')-Number(typeof a.biography==='string'));
  const user=users[0];
  const safeUrl=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}};
  const links=[...new Set(users.flatMap(u=>[u.external_url,...(Array.isArray(u.bio_links)?u.bio_links.map(l=>l.url):[])]).map(safeUrl).filter(Boolean))];
  const photo=users.map(u=>u.hd_profile_pic_url_info?.url||u.profile_pic_url_hd||u.profile_pic_url).map(safeUrl).find(Boolean)
    ||(titleName?safeUrl(meta['og:image']):null);
  return {username,displayName:user?.full_name??titleName,biography:users.find(u=>typeof u.biography==='string')?.biography??null,
    links,profilePhotoUrl:photo,logoVerified:false,
    coverage:{name:user?.full_name!=null?'embedded_profile':titleName?'og:title':'not_available',
      biography:users.some(u=>typeof u.biography==='string')?'embedded_profile':'not_available',
      links:users.some(u=>Array.isArray(u.bio_links))?'embedded_bio_links':links.length?'external_url_only':'not_available',
      profilePhoto:photo?'candidate_only':'not_available'},
    note:'URL de foto de perfil, no logo validado; campos ausentes no se infieren de textos promocionales. No se descargan imagenes.'};
}
