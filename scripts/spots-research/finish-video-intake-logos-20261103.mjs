import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root='docs/catalog-review/discovery/video-intake-20261103';
const summary=JSON.parse(await fs.readFile(`${root}/integration-summary.json`,'utf8'));
const reviewed={absentacali:'eb0b9a78742baa9a8e1604e7090ceb479b6c07e6cddc038a4d65a5e9e14491b2',cumbrepanycocina:'e6d0bb717a18044c51c19a2eaa25788a3797d2aed80c7bfc64797f234069f64a',cailecultoalperreo:'72edbcf1fdcb28b5dd5da36d85ff9d42faaabe474514768376870c2603f85091',sabormolidocali:'f6e2078301db6a4b298ffa336ea2a4e5973141e786c652b202a8d72d2785aafd',ceramica_almadelatierra:'0b66201923ea2c0a8f31aeaba635a6e7e228e448bf0e2ee619f3b0aa982c459e',sinfrenoscali:'d4e29035cadd54bfa9c175dc011819bfb1d753703f96b0d33956c970fd72c44e'};
for(const entry of summary.created){const sha=reviewed[entry.username];if(!sha)continue;
  const result=JSON.parse(execFileSync('node',['/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/profile-logo.mjs','finish',`${root}/${entry.username}/logo.json`,'logo','apps/mobile/public/spots-catalog.json',String(entry.id),sha],{encoding:'utf8'}));
  if(result.status!=='assigned')throw Error('Logo was not assigned');
  const file=`${root}/${entry.username}/consolidated.json`,c=JSON.parse(await fs.readFile(file,'utf8'));
  c.data.logo_url=result.logoUrl;c.write.fields.push('logo_url');await fs.writeFile(file,JSON.stringify(c,null,2)+'\n');
  entry.logo=result;console.log(JSON.stringify({name:entry.name,id:entry.id,status:result.status,logo:result.logoUrl}));
}
execFileSync('node',['/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/profile-logo.mjs','finish',`${root}/royipets/logo.json`,'cleanup'],{encoding:'utf8'});
await fs.writeFile(`${root}/integration-summary.json`,JSON.stringify(summary,null,2)+'\n');
