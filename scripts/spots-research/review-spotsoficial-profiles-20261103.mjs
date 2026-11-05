import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root='docs/catalog-review/spotsoficial-20261103';
const list=JSON.parse(await fs.readFile(`${root}/candidates.json`,'utf8'));
for(const [i,c] of list.entries()) {
 if(c.profileRecord)continue;
 const out=JSON.parse(execFileSync(process.execPath,['/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/extract-profile.mjs',c.username],{encoding:'utf8',timeout:25000,maxBuffer:1000000}));
 c.profileRecord=out.record;c.profileStatus=out.status;c.displayName=out.result?.displayName??null;c.biography=out.result?.biography??null;c.links=out.result?.links??[];
 c.activeStatus='pending_verification';
 await fs.writeFile(`${root}/candidates.json`,JSON.stringify(list,null,2)+'\n');
 console.log(`${i+1}/${list.length} ${c.username} ${out.status} ${out.result?.displayName??''}`);
 if([401,403,429].includes(out.httpStatus)){console.log('STOP: access restriction; remaining profiles pending');break;}
}
