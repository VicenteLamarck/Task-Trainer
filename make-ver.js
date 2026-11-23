// Se ejecuta en Netlify en cada publicación: crea ver.json (versión + huella de app.html).
// La app lo consulta (unos 60 bytes) para saber si hay una versión nueva que descargar.
const fs=require("fs"),c=require("crypto");
const buf=fs.readFileSync("www/app.html"),txt=buf.toString("utf8");
const v=(txt.match(/name="tt-ver" content="([^"]+)"/)||[])[1]||"0";
fs.writeFileSync("www/ver.json",JSON.stringify({v,h:c.createHash("sha1").update(buf).digest("hex").slice(0,16)}));
console.log("ver.json",v);
