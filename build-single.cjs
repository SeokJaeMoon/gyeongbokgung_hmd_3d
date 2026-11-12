const fs=require('node:fs'),path=require('node:path'),root=__dirname;
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
let scripts=[];
for(const f of ['js/sim.mjs','js/world.js','js/hmd.js','js/main.js']){
 let js=fs.readFileSync(path.join(root,f),'utf8');
 js=js.replace(/^import .+?from .+?;\s*$/gm,'');
 js=js.replace(/\bexport\s+(?=(?:const|function|class)\b)/g,'');
 scripts.push(`// ----- ${f} -----\n${js}`);
}
const full=`import * as THREE from 'three';\nimport {OrbitControls} from 'three/addons/controls/OrbitControls.js';\nimport {VRButton} from 'three/addons/webxr/VRButton.js';\n`+scripts.join('\n\n');
html=html.replace('<link rel="stylesheet" href="./style.css">',`<style>\n${css}\n</style>`);
html=html.replace('<script type="module" src="./js/main.js"></script>',`<script type="module">\n${full}\n</script>`);
fs.writeFileSync(path.join(root,'ThreeJS_경복궁_스마트시티_차량_드론_HMD.html'),html,'utf8');
console.log(`단일 HTML 생성 완료 (${html.length} chars)`);
