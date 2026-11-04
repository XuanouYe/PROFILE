import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync, spawn} from 'node:child_process';
import {watch} from 'node:fs';
const built = spawnSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});
if (built.status) process.exit(built.status);
const config = JSON.parse(await fs.readFile('site.config.json','utf8'));
const base = (process.env.BASE_PATH ?? config.basePath).replace(/\/$/,'');
const root = path.resolve(process.env.OUTPUT_DIR || 'dist');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp'};
const clients = new Set();
const liveReload = `<script>const updates=new EventSource('/__preview/events');updates.addEventListener('built',()=>location.reload());updates.addEventListener('build-error',event=>console.error('Preview build failed:',event.data));</script>`;
const server = http.createServer(async(req,res)=>{
  if (req.url === '/__preview/events') {
    res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
    res.write(': connected\n\n'); clients.add(res); req.on('close',()=>clients.delete(res)); return;
  }
  try {
    let pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if (base && pathname !== base && !pathname.startsWith(base+'/')) throw new Error('not found');
    pathname = pathname.slice(base.length) || '/';
    let file = path.resolve(root,'.'+pathname);
    if (!file.startsWith(root+path.sep) && file !== root) throw new Error('not found');
    const stat = await fs.stat(file);
    if(stat.isDirectory()) {
      if(!pathname.endsWith('/')) {res.writeHead(301,{Location:base+pathname+'/'+new URL(req.url,'http://localhost').search});res.end();return;}
      file = path.join(file,'index.html');
    }
    res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});const data=await fs.readFile(file);res.end(file.endsWith('.html')?data.toString().replace('</body>',liveReload+'</body>'):data);
  } catch {res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(await fs.readFile(path.join(root,'404.html')));}
});
let rebuildTimer;
const rebuild = () => {
  clearTimeout(rebuildTimer);
  rebuildTimer=setTimeout(()=>{
    const result=spawnSync(process.execPath,['scripts/build.mjs'],{encoding:'utf8'});
    const message=(result.stdout||'')+(result.stderr||'');
    process.stdout.write(message);
    for(const client of clients) client.write(`event: ${result.status===0?'built':'build-error'}\ndata: ${JSON.stringify(message)}\n\n`);
  },250);
};
const watchers=['content','public','scripts'].map(folder=>watch(folder,{recursive:true},rebuild));
watchers.push(watch('site.config.json',rebuild));
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'A preview is already running on this port. Open its local URL, or choose another PORT.':error);for(const watcher of watchers)watcher.close();process.exitCode=1;});
server.listen(Number(process.env.PORT || 4173),'127.0.0.1',()=>{
  const local=`http://127.0.0.1:${server.address().port}${base}/life/`;
  console.log(`Local: ${local}\nWatching Markdown, images, and site settings. Save a file to update the preview.`);
  if(process.argv.includes('--open'))spawn('/usr/bin/open',[local],{stdio:'ignore'});
});

