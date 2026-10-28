(function(){
const names={
original:["Original da feira","Azul e dourado, aparência atual","#061d34","#ffc52f","#0a304b"],
royal:["Royal Midnight","Azul profundo e dourado sofisticado","#0B1D31","#F3C977","#192F48"],
cloud:["Cloud Premium","Branco, azul e leveza minimalista","#F6F8FC","#315FD8","#FFFFFF"],
aurora:["Aurora Luxe","Violeta, roxo e profundidade","#211A3B","#C4A7FF","#352B57"],
emerald:["Emerald Class","Verde escuro, creme e elegância","#12362F","#E8D2A3","#1F4A40"],
studio:["Studio Editorial","Creme, preto e laranja contemporâneo","#F6F0E6","#D65B36","#FFFCF7"],
skyline:["Skyline Blue","Azul urbano e detalhes luminosos","#102C56","#74D9FF","#204575"]
};
const byId=id=>document.getElementById(id);
const c=window.FEIRA_CONFIG;
if(!window.supabase||!c?.supabaseUrl||!c?.supabaseAnonKey)return;
const db=window.FEIRA_DB ||= window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{detectSessionInUrl:false}});
let selected="original",published="original",authorized=false;
let loadPromise=null;
const buttons=new Map();
const message=text=>byId("tema-message").textContent=text;
function preview(){
const url="../?previewTema="+encodeURIComponent(selected);
// Evita recarregar o iframe quando a autenticação ou a aba atualiza.
const frame=byId("tema-preview");
if(frame.getAttribute("src")!==url)frame.setAttribute("src",url);
byId("tema-preview-link").href=url;
for(const [key,btn] of buttons)btn.setAttribute("aria-pressed",String(key===selected));
byId("tema-publish").disabled=selected===published;
}
function select(key){
if(!authorized||!Object.hasOwn(names,key))return;
selected=key;
try{localStorage.setItem("feira_tema_rascunho",key)}catch(e){}
preview();
message("Prévia pronta. O site público continua inalterado.");
}
const choices=byId("tema-cards");
for(const [key,[name,desc,bg,accent,card]] of Object.entries(names)){
const button=document.createElement("button");button.type="button";button.className="tema-choice";button.setAttribute("aria-pressed","false");
const thumb=document.createElement("div");thumb.className="tema-thumb";thumb.style.background=bg;
const nav=document.createElement("div");nav.className="mock-nav";
const word=document.createElement("span");word.textContent="FEIRA 2026";word.style.cssText="font-size:10px;font-weight:850;color:"+accent;
const dot=document.createElement("span");dot.textContent="✦";dot.style.color=accent;nav.append(word,dot);
const line=document.createElement("div");line.className="mock-line";line.style.background=accent;
const chips=document.createElement("div");chips.className="mock-chips";
for(let i=0;i<3;i++){let chip=document.createElement("span");chip.style.background=i===0?accent:card;chip.style.border="1px solid "+accent+"55";chips.append(chip)}
thumb.append(nav,line,chips);
const title=document.createElement("strong");title.textContent=name;
const description=document.createElement("small");description.textContent=desc;
button.append(thumb,title,description);button.onclick=()=>select(key);choices.append(button);buttons.set(key,button);
}
document.querySelectorAll("[data-viewport]").forEach(b=>b.addEventListener("click",()=>{
const mobile=b.dataset.viewport==="mobile";
byId("tema-frame-wrap").classList.toggle("is-mobile",mobile);
document.querySelectorAll("[data-viewport]").forEach(x=>x.style.outline=x===b?"2px solid #ffc52f":"");
}));
byId("tema-original").onclick=()=>select("original");
byId("tema-restore").onclick=()=>select(published);
byId("tema-publish").onclick=async()=>{
if(!authorized)return;
const name=names[selected][0];
if(!confirm('Publicar o tema "'+name+'" para TODOS os visitantes?'))return;
const btn=byId("tema-publish");btn.disabled=true;message("Publicando o tema...");
try{
const {data:{user},error:authError}=await db.auth.getUser();
if(authError||!user)throw new Error("Faça login novamente.");
const auth=await db.rpc("e_admin_feira");
if(auth.error||auth.data!==true)throw new Error("Seu usuário não tem permissão.");
const save=await db.from("feira_tema").update({tema:selected,atualizado_em:new Date().toISOString()}).eq("id",1).select("tema").single();
if(save.error)throw save.error;
if(save.data?.tema!==selected)throw new Error("O tema salvo não corresponde à seleção.");
published=selected;
byId("tema-publicado").textContent="Publicado: "+names[published][0];
message('Tema "'+name+'" publicado com sucesso. Os próximos visitantes verão a nova aparência.');
}catch(e){message("Não foi possível publicar: "+e.message)}
finally{btn.disabled=selected===published}
};
async function load(){
if(loadPromise)return loadPromise;
loadPromise=loadInner().finally(()=>{loadPromise=null});
return loadPromise;
}
async function loadInner(){
const {data:{session}}=await db.auth.getSession();
if(!session?.user){authorized=false;return}
const result=await db.rpc("e_admin_feira");
if(result.error||result.data!==true){authorized=false;return}
authorized=true;
const res=await db.from("feira_tema").select("tema").eq("id",1).single();
if(res.error){message("Erro ao carregar o tema publicado: "+res.error.message);return}
published=Object.hasOwn(names,res.data.tema)?res.data.tema:"original";
byId("tema-publicado").textContent="Publicado: "+names[published][0];
let draft=null;try{draft=localStorage.getItem("feira_tema_rascunho")}catch(e){}
// Preserva a escolha atual durante atualizações de sessão e da aba.
if(!byId("tema-preview").getAttribute("src"))selected=Object.hasOwn(names,draft)?draft:published;
preview();
}
db.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"||!session)authorized=false;});
document.querySelector('[data-tab="temas"]').addEventListener("click",load);
})();