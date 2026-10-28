(function(){
const c=window.FEIRA_CONFIG;
const form=document.getElementById("participar-form"),msg=document.getElementById("participar-msg");
if(!form||!window.supabase||!c?.supabaseUrl){return}
const client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{storageKey:"feira_inscricoes_auth",detectSessionInUrl:true,autoRefreshToken:false}});
const say=t=>msg.textContent=t;
const key="feira_inscricao_pendente";
let finishing=false;
let requesting=false;
const mailKey="feira_confirmacao_email_ultima";
async function finish(){
if(finishing)return;
let pending;
try{pending=JSON.parse(localStorage.getItem(key)||"null")}catch(e){return}
if(!pending?.nome||!pending?.email)return;
const {data:{session}}=await client.auth.getSession();
if(!session?.user)return;
if(session.user.email?.toLowerCase()!==pending.email.toLowerCase()){say("O e-mail confirmado é diferente do informado. Use o mesmo e-mail.");return}
finishing=true;
say("Finalizando sua inscrição...");
try{
 const {error}=await client.from("feira_inscricoes").insert({usuario_id:session.user.id,nome:pending.nome,email:pending.email});
 if(error)throw error;
 localStorage.removeItem(key);
 say("Inscrição confirmada! Seu e-mail foi verificado e o registro foi salvo.");
 form.reset();
}catch(err){say("Não foi possível concluir: "+err.message)}
finally{finishing=false}
}
form.addEventListener("submit",async e=>{
e.preventDefault();
const nome=document.getElementById("participar-nome").value.trim(),email=document.getElementById("participar-email").value.trim().toLowerCase();
if(nome.length<3||!form.reportValidity())return;
const btn=form.querySelector('button[type="submit"]');
if(requesting)return;
requesting=true;btn.disabled=true;say("Preparando confirmação por e-mail...");
try{
 localStorage.setItem(key,JSON.stringify({nome,email}));
 const {data:{session}}=await client.auth.getSession();
 if(session?.user?.email?.toLowerCase()===email){await finish();return}
 const last=JSON.parse(localStorage.getItem(mailKey)||"null");
 if(last?.email===email && Date.now()-last.at<120000){say("Já solicitamos a confirmação para este e-mail. Confira sua caixa de entrada e o spam antes de tentar novamente.");return;}
 const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname+"#participar",shouldCreateUser:true}});
 if(error)throw error;
 localStorage.setItem(mailKey,JSON.stringify({email,at:Date.now()}));
 say("Enviamos um link de confirmação para "+email+". Abra o link no mesmo navegador para concluir a inscrição. Confira também o spam.");
}catch(err){
 const limited=err?.status===429||/rate limit|too many|limite|exceeded|email rate/i.test(err?.message||"");
 if(limited)say("O serviço de e-mail da feira atingiu o limite de envios. Não é erro no seu cadastro. Tente mais tarde; a organização precisa ampliar o limite de e-mails no Supabase.");
 else say("Erro ao enviar confirmação: "+err.message);
}
finally{btn.disabled=false;requesting=false}
});
client.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_IN"&&session)setTimeout(finish,0)});
finish();
})();