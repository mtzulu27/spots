import fs from 'node:fs/promises';
import os from 'node:os';
import pathModule from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await fs.readFile(process.env.BIO_SCRIPT || '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/extract-bio-links.mjs','utf8');
const rendered=[];let fail=false;
const context=vm.createContext({fs,os,pathModule,performance,Buffer,crypto,console:{log(){}},
  execFileAsync:async(cmd,args)=>{
    if(fail)throw Error('missing tool');
    if(cmd==='pdfinfo')return {stdout:'Pages: 2\n'};
    if(cmd==='pdftotext')return {stdout:args.includes('-layout')?'A sufficiently long readable menu paragraph with one item costing 10000.\f\f':'<page><word xMin="1" yMin="2" xMax="3" yMax="4">Menu</word></page><page></page>'};
    if(cmd==='pdftoppm'){rendered.push(+args[1]);await fs.writeFile(args.at(-1)+'.png','fixture');return {stdout:''};}
    throw Error('Unexpected command');
  }});
vm.runInContext(source.slice(source.indexOf('async function extractPdf(')),context);
const dir=await fs.mkdtemp(pathModule.join(os.tmpdir(),'spots-pdf-test-'));
let pdf;
try{
  pdf=await context.extractPdf(new Response('%PDF-1.4 fixture'),'https://example.com/menu.pdf');
  assert.deepEqual(rendered,[2]);assert.equal(pdf.pages[0].words[0].xMin,1);
  await assert.rejects(fs.stat(pathModule.join(pdf.tempDir,'source.pdf')),{code:'ENOENT'});
  const report=pathModule.join(dir,'report.json'),review=pathModule.join(dir,'review.json');
  await fs.writeFile(report,JSON.stringify({pages:[{pdf}]}));
  await fs.writeFile(review,JSON.stringify({entries:[]}));
  await assert.rejects(context.finishPdfs(report,review),/every PDF page/);
  await fs.writeFile(review,JSON.stringify({entries:pdf.pages.map(p=>({source:pdf.source,page:p.page,status:p.page===1?'reviewed':'unreadable',text:p.text,products:[]}))}));
  await context.finishPdfs(report,review);
  const saved=JSON.parse(await fs.readFile(report));
  assert.equal(saved.pages[0].pdf.pages[1].review.status,'unreadable');
  await assert.rejects(fs.stat(pdf.tempDir),{code:'ENOENT'});
  const entries=pdf.pages.map(p=>({source:pdf.source,page:p.page,status:'reviewed',text:p.text,products:[]}));
  entries[1]={...entries[1],status:'skipped_promotional',reason:'promotional_only',text:'Campaign without regular menu prices'};
  for(const invalid of [{reason:'unknown'},{text:''},{products:[{name:'Offer',category:'Promotion',price:5000}]}]){
    await fs.writeFile(review,JSON.stringify({entries:[entries[0],{...entries[1],...invalid}]}));
    await assert.rejects(context.finishPdfs(report,review),/Invalid promotional omission/);
  }
  entries[0].products=[{name:'Menu item',category:'Food',price:null,priceStatus:'regular_price_unknown'}];
  await fs.writeFile(review,JSON.stringify({entries}));
  await context.finishPdfs(report,review);
  const classified=JSON.parse(await fs.readFile(report)).pages[0].pdf.pages;
  assert.equal(classified[1].status,'skipped_promotional');
  assert.equal(classified[1].review.reason,'promotional_only');
  assert.equal(classified[0].review.products[0].price,null);
  await assert.rejects(context.extractPdf(new Response('<html>login</html>'),'https://example.com/a'),/not a PDF/);
  fail=true;
  const before=(await fs.readdir(os.tmpdir())).filter(n=>n.startsWith('spots-pdf-')).sort();
  await assert.rejects(context.extractPdf(new Response('%PDF-test'),'https://example.com/a'),/missing tool/);
  assert.deepEqual((await fs.readdir(os.tmpdir())).filter(n=>n.startsWith('spots-pdf-')).sort(),before);
  console.log('PASS: text-first, page coordinates, selective render, PDF deleted, review coverage, promotional omission validation, unknown regular price, finish cleanup, invalid input, error cleanup');
}finally{if(pdf)await context.cleanupPdf(pdf);await fs.rm(dir,{recursive:true,force:true});}
