// TaskTrainer — servidor de IA (OPCIONAL). Cloudflare Worker. Sin probar: revísalo al desplegarlo.
// Variables secretas necesarias: ANTHROPIC_KEY, FIREBASE_API_KEY, FIREBASE_DB (URL de tu Realtime Database, sin barra final)
// Solo atiende a usuarios con sesión de Firebase y suscripción activa o prueba gratuita vigente.
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"POST, OPTIONS"};
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...CORS,"Content-Type":"application/json"}});
export default{async fetch(req,env){
 if(req.method==="OPTIONS")return new Response(null,{headers:CORS});
 try{
  const tk=(req.headers.get("Authorization")||"").replace("Bearer ","");
  const v=await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key="+env.FIREBASE_API_KEY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken:tk})});
  if(!v.ok)return J({error:"auth"},401);
  const uid=(await v.json()).users[0].localId;
  const u=await (await fetch(`${env.FIREBASE_DB}/users/${uid}.json?auth=${tk}`)).json();
  const ok=u&&(((u.until||0)>Date.now())||((u.created||0)+10*864e5>Date.now()));
  if(!ok)return J({error:"no-subscription"},403);
  const b=await req.json();let system,user,max=1600;
  if(b.task==="plan"){
   system="Eres el motor de planificación de TaskTrainer. Recibes la descripción de un proyecto o examen y devuelves SOLO un JSON válido, sin texto extra: {\"label\":\"tipo corto\",\"steps\":[{\"n\":\"micropaso concreto\",\"h\":horas_relativas,\"tip\":\"consejo breve\",\"frac\":0-1 opcional}]}. Entre 5 y 10 micropasos ESPECÍFICOS de la materia o del tipo de proyecto (un examen de lengua no tiene los mismos pasos que uno de matemáticas), ordenados, verbos de acción, nunca fases genéricas como planificar/ejecutar/revisar. frac solo para pasos que deben hacerse cerca de la fecha límite (simulacro, repaso final). Si ctx.mode es triage, solo lo esencial. Responde en el idioma indicado en lang.";
   user=JSON.stringify({nombre:b.name,descripcion:b.desc,fecha_limite:b.deadline,horas_disponibles:b.hours,lang:b.lang,ctx:b.ctx});
  }else if(b.role==="a"){
   system="Eres el asistente del administrador de TaskTrainer (FINANCE TRAINER GE). Responde en español, breve y con recomendaciones accionables, usando los datos recibidos.";user=JSON.stringify({pregunta:b.msg,datos:b.ctx});max=800;
  }else{
   system="Eres el asistente de TaskTrainer. Tu misión es recoger ideas de mejora, quejas y valoraciones de la app haciendo preguntas cortas, y resolver dudas sencillas de uso. Responde en el idioma indicado en lang, en pocas frases.";user=JSON.stringify({mensaje:b.msg,lang:b.lang,contexto:b.ctx});max=500;
  }
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":env.ANTHROPIC_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:"claude-sonnet-5-5",max_tokens:max,system,messages:[{role:"user",content:user}]})});
  const d=await r.json(),text=(d.content||[]).map(x=>x.text||"").join("");
  if(b.task==="plan"){const m=text.match(/\{[\s\S]*\}/);return J(JSON.parse(m[0]))}
  return J({reply:text});
 }catch(e){return J({error:"fail"},500)}
}};
