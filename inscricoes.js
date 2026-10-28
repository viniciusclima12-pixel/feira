(function(){
const c=window.FEIRA_CONFIG;
const form=document.getElementById("participar-form"), msg=document.getElementById("participar-msg");
if(!form||!window.supabase||!c?.supabaseUrl||!c?.supabaseAnonKey)return;
const client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{
 auth:{storageKey:"feira_google_participacao",detectSessionInUrl:true,autoRefreshToken:true}
});
const key="feira_google_inscricao_pendente";
const button=form.querySelector('button[type="submit"]');
const say=(t)=>{msg.textContent=t};
let submitting=false;
async function registrar(){
 if(submitting)return;
 let pending=false;
 try{pending=sessionStorage.getItem(key)==="sim"}catch(e){}
 if(!pending)return;
 submitting=true;button.disabled=true;say("Verificando sua conta Google e registrando a participação...");
 try{
  const {data:{session},error:sessionError}=await client.auth.getSession();
  if(sessionError)throw sessionError;
  if(!session?.user?.email){say("Faça login com uma conta Google que tenha e-mail.");return}
  // Confirma que o usuário da sessão veio realmente do provedor Google.
  if(!session.user.app_metadata?.providers?.includes("google") && session.user.app_metadata?.provider!=="google"){
   say("Para participar, use o botão Continuar com Google.");return;
  }
  const name=(session.user.user_metadata?.full_name||session.user.user_metadata?.name||session.user.email.split("@")[0]||"Participante").trim().slice(0,100);
  const {error}=await client.from("feira_inscricoes").insert({
   usuario_id:session.user.id,nome:name.length>=3?name:"Participante",email:session.user.email
  });
  if(error)throw error;
  try{sessionStorage.removeItem(key)}catch(e){}
  say("✓ Participação confirmada! "+name+", sua inscrição foi registrada. Você pode conferir sua presença na feira.");
 }catch(err){
  say("Não foi possível registrar: "+(err.message||"erro de conexão")+". Clique em Continuar com Google para tentar novamente.");
 }finally{submitting=false;button.disabled=false}
}
form.addEventListener("submit",async e=>{
 e.preventDefault();
 if(submitting)return;
 submitting=true;button.disabled=true;say("Conectando com o Google...");
 try{
  sessionStorage.setItem(key,"sim");
  const {data:{session}}=await client.auth.getSession();
  if(session?.user?.email && (session.user.app_metadata?.providers?.includes("google")||session.user.app_metadata?.provider==="google")){
   submitting=false;await registrar();return;
  }
  const {error}=await client.auth.signInWithOAuth({
   provider:"google",options:{redirectTo:location.origin+location.pathname+"#participar"}
  });
  if(error)throw error;
 }catch(err){
  submitting=false;button.disabled=false;say("Não foi possível abrir o Google: "+(err.message||"erro desconhecido"));
 }
});
client.auth.onAuthStateChange((event,session)=>{
 if(event==="SIGNED_IN"&&session) setTimeout(registrar,0);
});
registrar();
})();