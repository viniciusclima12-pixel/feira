const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=readFileSync(require('node:path').join(__dirname,'../inscricoes.js'),'utf8');
async function scenario(mode,action){
 const elements=new Map();
 const get=id=>{if(!elements.has(id))elements.set(id,{textContent:'',dataset:{},disabled:false,hidden:false,listeners:{},addEventListener(e,f){this.listeners[e]=f},replaceChildren(){},append(){}});return elements.get(id)};
 const session={user:{id:'fake-id',email:'teste@example.invalid',app_metadata:{provider:'google'},user_metadata:{full_name:'Pessoa fictícia'}}};
 let calls=0;
 const error={message:'INTERNAL_DATABASE_SECRET_DETAIL',code:mode==='duplicate'?'23505':mode==='denied'?'42501':'UNKNOWN'};
 const query={select(){return this},eq(){return this},order(){return this},limit:async()=>({data:[],error:null}),maybeSingle:async()=>({data:null,error:mode.startsWith('register')||['duplicate','denied'].includes(mode)?error:null}),insert(){return this},single:async()=>({data:null,error})};
 const auth={getSession:async()=>{calls++;return {data:{session:mode.startsWith('register')||['duplicate','denied'].includes(mode)?session:null},error:mode==='restore'?error:null}},signInWithOAuth:async()=>({error}),signOut:async()=>({error}),onAuthStateChange(){}};
 const values=new Map();if(mode.startsWith('register')||['duplicate','denied'].includes(mode))values.set('feira_google_inscricao_pendente_v2','sim');
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const window={FEIRA_CONFIG:{supabaseUrl:'fixture',supabaseAnonKey:'fixture'},supabase:{createClient:()=>({auth,from:()=>query})},sessionStorage:storage};window.self=window;window.top=window;
 const context={window,document:{getElementById:get,createElement:()=>({})},location:{origin:'https://fixture.invalid',pathname:'/',search:mode==='oauth'?'?error_description=INTERNAL_DATABASE_SECRET_DETAIL':'',hash:''},sessionStorage:storage,localStorage:storage,URLSearchParams,setTimeout,console};
 vm.runInNewContext(source,context);
 await new Promise(resolve=>setImmediate(resolve));
 if(action){await get(action).listeners.click();await new Promise(resolve=>setImmediate(resolve))}
 const text=get('participar-msg').textContent;
 assert(!text.includes('INTERNAL_DATABASE_SECRET_DETAIL'),mode);
 assert(text.length>20,mode);
 if(mode==='register-network')assert(text.includes('Verifique sua conexão'));
 if(mode==='denied')assert(text.includes('servidor recusou'));
 if(mode==='duplicate')assert(text.includes('já tem uma inscrição'));
 if(mode==='duplicate')assert.equal(get('participar-msg').dataset.type,'success');
 if(action)assert.equal(get(action).disabled,false);
 return {mode,action:action||'initial',text};
}
(async()=>{const results=[];for(const [mode,action] of [['oauth'],['restore'],['google','participar-google'],['switch','participar-novo'],['logout','participar-sair'],['register-network'],['denied'],['duplicate']])results.push(await scenario(mode,action));console.log(JSON.stringify({passed:results.length,results},null,2))})().catch(e=>{console.error(e);process.exit(1)});
