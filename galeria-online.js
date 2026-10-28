(async function(){
  const c=window.FEIRA_CONFIG;
  if(!c?.supabaseUrl||!c?.supabaseAnonKey||!window.supabase)return;
  const client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey);
  const {data,error}=await client.from("feira_fotos").select("titulo,caminho").order("criado_em",{ascending:false}).limit(200);
  if(error){console.warn("Fotos online indisponíveis:",error.message);return;}
  const grid=document.getElementById("gallery"),overlay=document.getElementById("overlay");
  const large=document.getElementById("large"),label=document.getElementById("label");
  if(!grid||!overlay||!large||!label)return;
  for(const photo of data){
    const url=client.storage.from("feira-fotos").getPublicUrl(photo.caminho).data.publicUrl;
    const tile=document.createElement("article");tile.className="tile";
    const btn=document.createElement("button");btn.type="button";btn.setAttribute("aria-label","Ampliar "+photo.titulo);
    const img=document.createElement("img");img.src=url;img.alt=photo.titulo;img.loading="lazy";img.decoding="async";
    const title=document.createElement("strong");title.textContent=photo.titulo;
    btn.append(img,title);tile.append(btn);grid.append(tile);
    btn.addEventListener("click",()=>{
      large.src=url;large.alt=photo.titulo;label.textContent=photo.titulo;
      overlay.classList.add("open");document.body.style.overflow="hidden";
      document.getElementById("close").focus();
    });
  }
})();
