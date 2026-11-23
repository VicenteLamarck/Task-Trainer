// TaskTrainer — service worker: funciona sin conexión y se actualiza solo cuando hay internet.
const C="tt-cache-v1";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["./","index.html","app.html","manifest.webmanifest","icon-192.png"]).catch(()=>{})))});
self.addEventListener("activate",e=>e.waitUntil(clients.claim()));
self.addEventListener("fetch",e=>{
  const r=e.request;
  if(r.method!=="GET"||!r.url.startsWith(self.location.origin))return;               // Firebase, WhatsApp, etc.: no se tocan
  const p=new URL(r.url).pathname,isDoc=r.mode==="navigate"||p.endsWith("/")||p.endsWith("index.html")||p.endsWith("app.html")||p.endsWith("ver.json");
  if(isDoc){ // la app: primero red (versión nueva); si tarda más de 3,5 s o no hay internet, la guardada
    e.respondWith(Promise.race([
      fetch(r).then(x=>{const cp=x.clone();caches.open(C).then(c=>c.put(r,cp));return x}),
      new Promise((_,no)=>setTimeout(no,3500))
    ]).catch(()=>caches.match(r).then(m=>m||caches.match("index.html")||caches.match("./"))));
  }else{ // librerías (lector de PDF), iconos…: primero lo guardado
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>{const cp=x.clone();caches.open(C).then(c=>c.put(r,cp));return x})));
  }
});
