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
  const position=value=>typeof value==='number'&&Number.isFinite(value)?value:Infinity;
  const date=value=>{const parsed=typeof value==='string'?Date.parse(value):NaN;return Number.isFinite(parsed)?parsed:Infinity;};
  const photos=(Array.isArray(data)?data:[])
    .filter(photo=>photo&&typeof photo.caminho==='string'&&photo.caminho.trim())
    .map((photo,order)=>({...photo,caminho:photo.caminho.trim(),titulo:typeof photo.titulo==='string'&&photo.titulo.trim()?photo.titulo.trim():'Cartaz da feira',order}))
    .sort((a,b)=>{
      const pa=position(a.posicao),pb=position(b.posicao);
      if(pa!==pb)return pa<pb?-1:1;
      const ma=a.caminho.match(originals),mb=b.caminho.match(originals);
      if(ma&&mb&&Number(ma[1])!==Number(mb[1]))return Number(ma[1])-Number(mb[1]);
      if(Boolean(ma)!==Boolean(mb))return ma?-1:1;
      const da=date(a.criado_em),db=date(b.criado_em);
      return da===db?a.order-b.order:da<db?-1:1;
    });
  grid.replaceChildren();
  if(!photos.length){
    const empty=document.createElement('p');
    empty.className='gallery-empty';
    empty.textContent='Os cartazes serão publicados em breve.';
    grid.append(empty);
    return;
  }
  let opener=null,previousOverflow='';
  const closeButton=document.getElementById('close');
  if(!closeButton)return;
  const background=[...document.body.children].filter(el=>!['SCRIPT','STYLE'].includes(el.tagName)&&el!==overlay);
  const inertState=new Map();
  const restore=()=>{
    if(!opener)return;
    document.body.style.overflow=previousOverflow;
    for(const [el,wasInert] of inertState)el.inert=wasInert;
    inertState.clear();
    const target=opener;opener=null;
    if(target.isConnected)target.focus();
  };
  const closePoster=()=>{overlay.classList.remove('open');large.removeAttribute('src');restore();};
  closeButton.addEventListener('click',closePoster);
  overlay.addEventListener('click',event=>{if(event.target===overlay)closePoster();});
  document.addEventListener('keydown',event=>{
    if(!opener)return;
    if(event.key==='Escape'){event.preventDefault();closePoster();}
    if(event.key==='Tab'){event.preventDefault();closeButton.focus();}
  });
  document.addEventListener('focusin',event=>{
    if(overlay.classList.contains('open')&&!overlay.contains(event.target))closeButton.focus();
  });
  const openPoster=(photo,url,button)=>{
    opener=button;previousOverflow=document.body.style.overflow;
    for(const el of background){inertState.set(el,el.inert);el.inert=true;}

    large.src=url;large.alt=photo.titulo;label.textContent=photo.titulo;
    overlay.classList.add('open');document.body.style.overflow='hidden';
    closeButton.focus();
  };
  // O primeiro cartaz continua em destaque. Os demais são cartões compactos.
  photos.forEach((photo,index)=>{
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
      flag.className='tile-featured-label';flag.textContent=/^(serviços e atividades gratuitos|informações da feira)$/i.test(photo.titulo.trim())?'Informações da feira':'Cartaz em destaque';
      tile.append(flag);
    }
    btn.append(img,info);tile.append(btn);grid.append(tile);
    btn.addEventListener('click',()=>openPoster(photo,url,btn));
  });
})();
