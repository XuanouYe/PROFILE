import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import {loadEntries,validate} from '../scripts/content.mjs';

async function walk(dir) {
  return (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(item=>item.isDirectory()?walk(path.join(dir,item.name)):[path.join(dir,item.name)]))).flat();
}

test('published entry filenames, directories and slugs follow the documented organization',async()=>{
  for(const file of (await walk('content/entries')).filter(file=>file.endsWith('.md'))) {
    const source=await fs.readFile(file,'utf8');
    const entry=YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]);
    const kind=entry.longform?'article':'log';
    assert.match(entry.slug,new RegExp(`^${entry.subject}-${kind}-(?:\\d{4}-\\d{2}-\\d{2}|undated)-[a-z0-9]+(?:-[a-z0-9]+)*$`),file);
    const year=entry.publicationDate?.slice(0,4)||'undated';
    assert.equal(file,path.join('content/entries',entry.subject,kind+'s',year,entry.slug+'.md'));
  }
});

test('aliases reject unsafe names, duplicates and route collisions',async()=>{
  const entry={title:'Test',slug:'test',excerpt:'',publicationDate:null,subject:'music',longform:false,draft:false};
  for(const aliases of ['old-name',['../escape'],['articles/en'],['Bad Name']]) assert.throws(()=>validate({...entry,aliases},'test'));
  await fs.mkdir('.preview',{recursive:true});
  const root=await fs.mkdtemp(path.resolve('.preview/alias-test-'));
  const folder=path.join(root,'content/entries');
  await fs.mkdir(folder,{recursive:true});
  const write=(file,value)=>fs.writeFile(path.join(folder,file),'---\n'+YAML.stringify(value)+'---\n');
  try {
    await write('first.md',{...entry,aliases:['old-name']});
    assert.equal((await loadEntries(root,false)).length,1);
    for(const change of [{slug:'old-name'},{slug:'second',aliases:['old-name']},{slug:'second',aliases:['articles']},{slug:'second',aliases:['second']}]) {
      await write('second.md',{...entry,...change});
      await assert.rejects(loadEntries(root,false),/Duplicate or reserved slug/);
    }
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});
