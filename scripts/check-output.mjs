import fs from 'node:fs/promises';
import path from 'node:path';
const config=JSON.parse(await fs.readFile('site.config.json','utf8'));
const base=(process.env.BASE_PATH??config.basePath).replace(/\/$/,'');
const root=path.resolve(process.env.OUTPUT_DIR||'dist');
async function walk(dir){return (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(d=>d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)]))).flat();}
const files=(await walk(root)).filter(f=>f.endsWith('.html'));
let checked=0;
for(const file of files){
  const html=await fs.readFile(file,'utf8');
  for(const [,raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if(!raw.startsWith('/')||raw.startsWith('//')) continue;
    const pathname=new URL(raw.replaceAll('&amp;','&'),'https://example.test').pathname;
    if(!pathname.startsWith(base+'/')) throw new Error(`Missing base path in ${file}: ${raw}`);
    const relative=decodeURIComponent(pathname.slice(base.length));
    const target=path.join(root,relative,relative.endsWith('/')?'index.html':'');
    try {await fs.access(target);} catch {throw new Error(`Broken link in ${file}: ${raw}`);}
    checked++;
  }
}
console.log(`Checked ${checked} local links and assets across ${files.length} HTML pages.`);
