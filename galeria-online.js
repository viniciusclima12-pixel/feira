(async function(){
  const c=window.FEIRA_CONFIG;
  if(!c?.supabaseUrl||!c?.supabaseAnonKey||!window.supabase)return;
  const client=(window.FEIRA_PUBLIC_DB ||= window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}));
  const {data,error}=await client.from('feira_fotos').select('titulo,caminho,criado_em,posicao').limit(1000);
  if(error){console.warn('Fotos online indisponíveis:',error.message);return;}
  const grid=document.getElementById('gallery'),overlay=document.getElementById('overlay');
  const large=document.getElementById('large'),label=document.getElementById('label');
  if(!grid||!overlay||!large||!label)return;
  const originals=/^originais\/cartaz-(\d+)\.(png|jpe?g)$/i;
  data.sort((a,b)=>{
    if(a.posicao!=null||b.posicao!=null){const p=(a.posicao??999999)-(b.posicao??999999);if(p)return p;}
    const ma=a.caminho.match(originals),mb=b.caminho.match(originals);
    if(ma&&mb)return Number(ma[1])-Number(mb[1]);
    if(ma)return -1;
    if(mb)return 1;
    return new Date(a.criado_em)-new Date(b.criado_em);
  });
  grid.replaceChildren();
  if(!data.length){
    const empty=document.createElement('p');
    empty.className='gallery-empty';
    empty.textContent='Os cartazes serão publicados em breve.';
    grid.append(empty);
    return;
  }
  const openPoster=(photo,url)=>{
    large.src=url;large.alt=photo.titulo;label.textContent=photo.titulo;
    overlay.classList.add('open');document.body.style.overflow='hidden';
    document.getElementById('close').focus();
  };
  // O primeiro cartaz continua em destaque. Os demais são cartões compactos.
  data.forEach((photo,index)=>{
    const url=client.storage.from('feira-fotos').getPublicUrl(photo.caminho).data.publicUrl;
    const tile=document.createElement('article');
    tile.className=index===0?'tile tile-featured':'tile tile-compact';
    const btn=document.createElement('button');
    btn.type='button';
    btn.setAttribute('aria-label','Ampliar cartaz: '+photo.titulo);
    const img=document.createElement('img');
    img.src=url;img.alt=photo.titulo;img.loading=index===0?'eager':'lazy';img.decoding='async';
    const info=document.createElement('div');info.className='tile-info';
    const title=document.createElement('strong');title.textContent=photo.titulo;
    const hint=document.createElement('span');hint.className='tile-action';hint.textContent='Ver cartaz completo ↗';
    info.append(title,hint);
    if(index===0){
      const flag=document.createElement('span');
      flag.className='tile-featured-label';flag.textContent='Informações da feira';
      tile.append(flag);
    }
    btn.append(img,info);tile.append(btn);grid.append(tile);
    btn.addEventListener('click',()=>openPoster(photo,url));
  });
})();
