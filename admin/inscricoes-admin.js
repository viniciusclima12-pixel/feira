(function(){
const c=window.FEIRA_CONFIG;
if(!window.supabase||!c?.supabaseUrl||!c?.supabaseAnonKey)return;
const db=window.FEIRA_DB ||= window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{detectSessionInUrl:false}});
const el=id=>document.getElementById(id);
let entries=[],busy=false,authorized=false;
const status=t=>el("inscricoes-status").textContent=t;
function render(){
const q=el("inscricoes-search").value.trim().toLocaleLowerCase("pt-BR");
const shown=entries.filter(p=>(p.nome+" "+p.email).toLocaleLowerCase("pt-BR").includes(q));
const target=el("inscricoes-items");target.replaceChildren();
el("inscricoes-count").textContent=entries.length+" inscrições registradas";
if(!shown.length){const p=document.createElement("p");p.className="muted";p.textContent=q?"Nenhuma inscrição encontrada.":"Ainda não há inscrições.";target.append(p);return}
for(const p of shown){
const row=document.createElement("div");row.className="trash-row";
const left=document.createElement("div");
const name=document.createElement("strong");name.textContent=p.nome;
const details=document.createElement("small");details.className="muted";
const date=new Date(p.criado_em).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"});
details.textContent=p.email+" • "+date;
left.append(name,details);
const pill=document.createElement("span");pill.className="muted";pill.textContent=p.status==="confirmada"?"E-mail confirmado":"Cancelada";
row.append(left,pill);target.append(row);
}
}
async function load(){
if(busy||!authorized||el("admin-visao").classList.contains("hidden"))return;
busy=true;status("Carregando inscrições...");
try{
const {data,error}=await db.from("feira_inscricoes").select("id,nome,email,criado_em,status").order("criado_em",{ascending:false}).limit(300);
if(error)throw error;
entries=data||[];render();status("Inscrições carregadas. Apenas administradores podem ver os e-mails.");
}catch(err){status("Erro ao carregar inscrições: "+err.message)}
finally{busy=false}
}
el("inscricoes-search").addEventListener("input",render);
el("inscricoes-refresh").addEventListener("click",load);
window.addEventListener("feira:autorizado",()=>{authorized=true;load()});
window.addEventListener("feira:aba",ev=>{if(ev.detail==="visao")load()});
db.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){authorized=false;entries=[];render()}});
})();