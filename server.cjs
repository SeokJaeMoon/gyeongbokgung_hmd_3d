const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,port=process.env.PORT||8000;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,`http://localhost:${port}`).pathname);
  const f=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!f.startsWith(root+path.sep)&&f!==path.join(root,'index.html')){res.writeHead(403);return res.end('Forbidden');}
  fs.stat(f,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);return res.end('Not found');}
   res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache','Access-Control-Allow-Origin':'*'});fs.createReadStream(f).pipe(res);
  });
 }catch(e){res.writeHead(400);res.end('Bad request');}
}).listen(port,'127.0.0.1',()=>console.log(`경복궁 HMD 로컬 서버: http://127.0.0.1:${port}`));
