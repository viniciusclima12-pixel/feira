/* Vitrine de expositores. Mantém a mesma ordem do painel administrativo. */
(async function(){
  const grid=document.getElementById('gallery');
  const search=document.getElementById('gallery-search');
  const count=document.getElementById('gallery-count');
  const more=document.getElementById('gallery-more');
  const overlay=document.getElementById('overlay');
  const large=document.getElementById('large');
  const label=document.getElementById('label');
  if(!grid||!overlay||!large||!label)return;
  const report=(message)=>{
    grid.replaceChildren();
    const notice=document.createElement('p');
    notice.className='gallery-empty';notice.textContent=message;grid.append(notice);
    if(more)more.hidden=true;
  };
  const config=window.FEIRA_CONFIG;
  if(!config?.supabaseUrl||!config?.supabaseAnonKey||!window.supabase){
    report('Não foi possível carregar os cartazes agora. Atualize a página para tentar novamente.');
    return;
  }
  const client=(window.FEIRA_PUBLIC_DB ||= window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}));
  let data;
  try{
    const result=await client.from('feira_fotos').select('titulo,caminho,criado_em,posicao').limit(1000);
    if(result.error)throw result.error;
    data=result.data||[];
  }catch(err){
    console.warn('Não foi possível carregar os cartazes:',err);
    report('Não foi possível carregar os expositores. Atualize a página para tentar novamente.');
    return;
  }
  // Mesma regra do admin: posição explícita e, em seguida, ordem dos originais.
  const originals=/^originais\/cartaz-(\d+)\.(png|jpe?g)$/i;
  data.sort((a,b)=>{
    if(a.posicao!=null||b.posicao!=null){
      const p=(a.posicao??999999)-(b.posicao??999999);
      if(p)return p;
    }
    const ma=a.caminho.match(originals),mb=b.caminho.match(originals);
    if(ma&&mb)return Number(ma[1])-Number(mb[1]);
    if(ma)return -1;
    if(mb)return 1;
    return new Date(a.criado_em)-new Date(b.criado_em);
  });
  const clean=(value)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  const openPoster=(photo,url)=>{
    large.src=url;large.alt=photo.titulo;label.textContent=photo.titulo;
    overlay.classList.add('open');document.body.style.overflow='hidden';
    document.getElementById('close')?.focus();
  };
  let expanded=false;
  const render=()=>{
    const q=clean(search?.value.trim());
    const matches=data.map((photo,index)=>({photo,index})).filter(x=>!q||clean(x.photo.titulo).includes(q));
    const visible=q||expanded?matches:matches.slice(0,5);
    grid.replaceChildren();
    if(count)count.textContent=q?`${matches.length} resultado${matches.length===1?'':'s'}`:`${data.length} cartaz${data.length===1?'':'es'}`;
    if(!matches.length){
      report(q?'Nenhum expositor encontrado. Experimente outro nome.':'Os cartazes serão publicados em breve.');
      return;
    }
    for(const {photo,index} of visible){
      const url=client.storage.from('feira-fotos').getPublicUrl(photo.caminho).data.publicUrl;
      const tile=document.createElement('article');
      tile.className=index===0?'tile tile-featured':'tile tile-compact';
      const btn=document.createElement('button');
      btn.type='button';btn.setAttribute('aria-label','Ampliar cartaz: '+photo.titulo);
      const img=document.createElement('img');
      img.src=url;img.alt=photo.titulo;
      img.loading=index===0?'eager':'lazy';img.decoding='async';
      const info=document.createElement('div');info.className='tile-info';
      const title=document.createElement('strong');
      title.textContent=photo.titulo.replace(/^Expositor:\s*/i,'');
      const hint=document.createElement('span');hint.className='tile-action';hint.textContent='Ver cartaz completo ↗';
      info.append(title,hint);
      if(index===0){
        const tag=document.createElement('span');tag.className='tile-featured-label';
        tag.textContent=/^(serviços e atividades gratuitos|informações da feira)$/i.test(photo.titulo.trim())?'Informações da feira':'Em destaque';
        tile.append(tag);
      }
      btn.append(img,info);tile.append(btn);grid.append(tile);
      btn.addEventListener('click',()=>openPoster(photo,url));
    }
    if(more){
      more.hidden=!!q||data.length<=5;
      more.innerHTML=expanded?'Mostrar menos <span aria-hidden="true">↑</span>':'Ver todos os expositores <span aria-hidden="true">↓</span>';
      more.setAttribute('aria-expanded',String(expanded));
      more.setAttribute('aria-controls','gallery');
    }
  };
  if(search)search.addEventListener('input',render);
  if(more)more.addEventListener('click',()=>{
    expanded=!expanded;
    render();
    if(!expanded)document.getElementById('expositores-titulo')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  render();
})();