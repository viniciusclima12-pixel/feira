(async function(){
  const c=window.FEIRA_CONFIG;
  if(!c?.supabaseUrl||!c?.supabaseAnonKey||!window.supabase)return;
  const client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey);
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
  for(const photo of data){
    const url=client.storage.from('feira-fotos').getPublicUrl(photo.caminho).data.publicUrl;
    const tile=document.createElement('article');tile.className='tile';
    const btn=document.createElement('button');btn.type='button';btn.setAttribute('aria-label','Ampliar '+photo.titulo);
    const img=document.createElement('img');img.src=url;img.alt=photo.titulo;img.loading='lazy';img.decoding='async';
    const title=document.createElement('strong');title.textContent=photo.titulo;
    btn.append(img,title);tile.append(btn);grid.append(tile);
    btn.addEventListener('click',()=>{
      large.src=url;large.alt=photo.titulo;label.textContent=photo.titulo;
      overlay.classList.add('open');document.body.style.overflow='hidden';
      document.getElementById('close').focus();
    });
  }
})();
