(function(){
const themes={
original:null,
royal:["#0B1D31","#F3C977","#FFFFFF","#BDCCDB","#192F48","#0A1929","Georgia,serif","14px","radial-gradient(ellipse at 80% 0%,#2E4869,transparent 55%),#0B1D31"],
cloud:["#F6F8FC","#315FD8","#16263B","#566A85","#FFFFFF","#EDF2F9","system-ui,sans-serif","23px","radial-gradient(ellipse at 80% 0%,#DCE6FF,transparent 60%),#F6F8FC"],
aurora:["#211A3B","#C4A7FF","#FFFFFF","#D6CDEB","#352B57","#292147","system-ui,sans-serif","28px","radial-gradient(ellipse at 80% 0%,#65419E,transparent 60%),#211A3B"],
emerald:["#12362F","#E8D2A3","#FFFEF7","#C1D6CE","#1F4A40","#102F29","Georgia,serif","17px","radial-gradient(ellipse at 90% 0%,#2C6451,transparent 60%),#12362F"],
studio:["#F6F0E6","#D65B36","#252323","#635D57","#FFFCF7","#EFE5D9","Arial,sans-serif","8px","linear-gradient(135deg,#F6F0E6,#FFF9EE)"],
skyline:["#102C56","#74D9FF","#FFFFFF","#CBDBEF","#204575","#102747","system-ui,sans-serif","22px","radial-gradient(ellipse at 75% 0%,#3169A6,transparent 55%),#102C56"]};
function apply(name){
 if(!Object.hasOwn(themes,name))name="original";
 document.documentElement.dataset.feiraTema=name;
 document.getElementById("feira-dynamic-theme")?.remove();
 if(name==="original")return;
 const t=themes[name],style=document.createElement("style");style.id="feira-dynamic-theme";
 style.textContent=":root{color-scheme:"+((name==="cloud"||name==="studio")?"light":"dark")+";--navy:"+t[0]+";--gold:"+t[1]+";--text:"+t[2]+";--muted:"+t[3]+"}"+
 "body{background:"+t[8]+";color:var(--text);font-family:"+t[6]+"}.wrap{max-width:1160px}"+
 "header{padding:75px 0 45px}h1{font-size:clamp(2.2rem,5.7vw,4.2rem);line-height:1.08;max-width:980px}.lead{color:"+t[3]+";font-size:1.08rem}"+
 ".pill{background:"+t[4]+";color:"+t[2]+";border:1px solid "+t[1]+"45;box-shadow:0 5px 20px #00000010}"+
 ".intro h2{color:"+t[2]+";font-size:clamp(1.8rem,3.5vw,2.6rem)}.intro p{color:"+t[3]+"}"+
 ".tile{background:"+t[4]+";border:1px solid "+t[1]+"35;border-radius:"+t[7]+";box-shadow:0 12px 35px #00000018;transition:transform .22s,box-shadow .22s,border-color .22s}"+
 ".tile:hover{transform:translateY(-5px);box-shadow:0 20px 42px #0000002b;border-color:"+t[1]+"}"+
 ".tile img{background:"+t[5]+"}.tile strong{font-family:system-ui,sans-serif;color:"+t[2]+"}"+
 "footer{color:"+t[3]+";border-color:"+t[1]+"38}"+
 "@media(prefers-reduced-motion:reduce){.tile{transition:none}.tile:hover{transform:none}}";
 if(name==="cloud")style.textContent+="header,.intro{text-align:left}.lead{margin-left:0}.pills{justify-content:flex-start}.tile{box-shadow:0 8px 30px #10275312}";
 if(name==="aurora")style.textContent+=".pill{backdrop-filter:blur(12px)}.tile:nth-child(3n+2){border-top:4px solid #C4A7FF}";
 if(name==="emerald")style.textContent+=".eyebrow{letter-spacing:.23em}.intro h2{font-family:Georgia,serif}";
 if(name==="studio")style.textContent+="header{text-align:left;border-bottom:2px solid #252323;padding-bottom:35px}.lead{margin-left:0}.pills{justify-content:flex-start}.intro{text-align:left}.gallery{gap:13px}.tile strong{font-weight:800}";
 if(name==="skyline")style.textContent+=".tile:nth-child(4n+2){border-top:3px solid #74D9FF}.gallery{gap:17px}";
 document.head.append(style);
}
window.FEIRA_TEMAS={themes,apply};
const preview=new URLSearchParams(location.search).get("previewTema");
if(preview&&Object.hasOwn(themes,preview)){apply(preview);window.addEventListener("message",event=>{if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=="feira:preview-tema")return;const next=event.data.tema;if(Object.hasOwn(themes,next))apply(next)});return;}
const c=window.FEIRA_CONFIG;
if(!window.supabase||!c?.supabaseUrl||!c?.supabaseAnonKey)return;
(window.FEIRA_PUBLIC_DB ||= window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})).from("feira_tema").select("tema").eq("id",1).maybeSingle().then(({data,error})=>{if(!error&&data)apply(data.tema)}).catch(()=>{});
})();