/* 인터넷 연결이 있을 때 한 번 실행. 외부 CDN 서버에서 정확한 Three.js r180 모듈만 내려받는다. */
const fs=require('node:fs'),path=require('node:path'),https=require('node:https');
const version='0.180.0',base=`https://cdn.jsdelivr.net/npm/three@${version}/`;
const files=['build/three.core.js','build/three.module.js','examples/jsm/controls/OrbitControls.js','examples/jsm/webxr/VRButton.js'];
async function get(url){
 return new Promise((resolve,reject)=>{
  const req=https.get(url,r=>{
   if(r.statusCode===301||r.statusCode===302||r.statusCode===307)return resolve(get(r.headers.location));
   if(r.statusCode!==200)return reject(new Error(`HTTP ${r.statusCode}: ${url}`));
   const arr=[];r.on('data',d=>arr.push(d));r.on('end',()=>resolve(Buffer.concat(arr)));
  });req.on('error',reject);req.setTimeout(20000,()=>req.destroy(new Error('timeout')));
 });
}
(async()=>{
 for(const f of files){const data=await get(base+f);const out=path.join(__dirname,'vendor',f);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,data);console.log(`저장됨 ${f} (${data.length} bytes)`);}
 console.log('완료. node server.cjs 실행 → http://127.0.0.1:8000/index.offline.html');
})().catch(e=>{console.error('인터넷 연결 또는 CDN 접근 오류:',e.message);process.exitCode=1;});
