import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {VRButton} from 'three/addons/webxr/VRButton.js';
import {Simulation,SITES,NO_FLY,findSite,signalColor} from './sim.mjs';
import {buildPalace,makeCar,makeDrone,routeMeshes,remove3D} from './world.js';
import {createHMD} from './hmd.js';

const $=id=>document.getElementById(id);
const host=$('viewport'),stage=$('stage');
const sim=new Simulation();
let rate=1,view='over',night=false,routeObject=null,barrierObject=null,hudVisible=true;
let lastMessage='',lastEvents='',uiAt=0,lastTime=0;
let currentPreset='over';
const tmp=new THREE.Vector3(),targetPos=new THREE.Vector3(),targetLook=new THREE.Vector3();

// 실제 3D 모듈이 정상 도착하면 이 화면을 우선 표시한다. 외부 모듈이 실패하면 2D 진단 배경이 남는다.
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.8));
renderer.setSize(host.clientWidth,host.clientHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.xr.enabled=true;
renderer.domElement.setAttribute('aria-label','경복궁 자율주행차 및 무인항공기 Three.js 3D 가상환경');
host.appendChild(renderer.domElement);
window.__gbReady=true;
$('fallback').style.display='none';

document.body.appendChild(VRButton.createButton(renderer));
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(68,1,.08,160);scene.add(camera);
const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true;orbit.dampingFactor=.075;orbit.minDistance=3;orbit.maxDistance=86;
orbit.maxPolarAngle=Math.PI*.49;orbit.target.set(0,0,-1);
const palace=buildPalace(scene);
const vehicle=makeCar(scene),aircraft=makeDrone(scene);
const hmd=createHMD(camera);
routeObject=routeMeshes(scene,sim);

// HMD 메뉴는 실제 Three.js Plane Mesh + CanvasTexture로 구성한다.
const raycaster=new THREE.Raycaster();const mouse=new THREE.Vector2();
function action(name){
  try{
    if(name==='view-car')return setView('car');
    if(name==='view-drone')return setView('drone');
    if(name==='view-chase')return setView('chase');
    if(name==='view-over')return setView('over');
    if(name==='start')return start();
    if(name==='pause')return togglePause();
    if(name==='reset')return reset();
    if(name==='build')return prepare();
    if(name==='cycle-from'||name==='cycle-to'){
      const from=name==='cycle-from',now=from?sim.spec.carFrom:sim.spec.carTo;
      const other=from?sim.spec.carTo:sim.spec.carFrom;
      const index=SITES.findIndex(s=>s.id===now);
      for(let i=1;i<SITES.length;i++){
        const next=SITES[(index+i)%SITES.length];if(next.id===other)continue;
        $(from?'carFrom':'carTo').value=next.name;
        $(from?'droneFrom':'droneTo').value=next.name;prepare();break;
      }
    }
  }catch(e){message(e.message,true);}
}
renderer.domElement.addEventListener('pointerdown',e=>{
  if(renderer.xr.isPresenting)return;
  const r=renderer.domElement.getBoundingClientRect();
  mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
  camera.updateMatrixWorld(true);raycaster.setFromCamera(mouse,camera);
  const hit=raycaster.intersectObjects(hmd.hitMeshes,false)[0];
  if(hit){e.stopImmediatePropagation();action(hit.object.userData.action);}
},true);

// VR controller: HMD 메뉴는 가상 3D 공간에서 레이 선택 가능
for(let i=0;i<2;i++){
  const c=renderer.xr.getController(i);scene.add(c);
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-5)]),new THREE.LineBasicMaterial({color:0x73fff0,transparent:true,opacity:.8}));c.add(line);
  c.addEventListener('selectstart',()=>{
    scene.updateMatrixWorld(true);
    const mat=new THREE.Matrix4().extractRotation(c.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld);
    raycaster.ray.direction.set(0,0,-1).applyMatrix4(mat);
    const hit=raycaster.intersectObjects(hmd.hitMeshes,false)[0];if(hit)action(hit.object.userData.action);
  });
}
renderer.xr.addEventListener('sessionstart',()=>{
  sim.pause();rate=1;$('rate').value='1';orbit.enabled=false;document.body.classList.add('xr-active');
  camera.position.set(0,1.65,17);camera.lookAt(0,1.6,6);hmd.layout(1.4);
  message('VR 모드: 컨트롤러 레이로 HMD 메뉴를 선택하세요. 교육용 가상 경로입니다.');
});
renderer.xr.addEventListener('sessionend',()=>{
  document.body.classList.remove('xr-active');setView('over');
});

function message(text,error=false){
  const n=$('runtimeStatus');n.textContent=text;n.style.color=error?'#ffd1b4':'#d0fff4';
  lastMessage=text;
}
function readSpec(){
  return {carFrom:findSite($('carFrom').value).id,carTo:findSite($('carTo').value).id,
    droneFrom:findSite($('droneFrom').value).id,droneTo:findSite($('droneTo').value).id,
    altitude:Number($('altitude').value),restricted:$('restricted').checked};
}
function specChanged(next){return Object.keys(next).some(k=>next[k]!==sim.spec[k]);}
function removeBarrier(){if(barrierObject){remove3D(barrierObject);barrierObject=null;}}
function syncObstacle(){
  if(!sim.obstacle){removeBarrier();$('obstacle').textContent='▧ 장애물 추가';return;}
  if(!barrierObject){
    barrierObject=new THREE.Group();scene.add(barrierObject);
    const base=new THREE.Mesh(new THREE.BoxGeometry(1.8,.34,.26),new THREE.MeshStandardMaterial({color:0xe3784f,roughness:.65}));base.position.y=.47;barrierObject.add(base);
    for(const x of [-.62,.62]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.10,.75,.10),new THREE.MeshStandardMaterial({color:0x202d36}));leg.position.set(x,.32,0);barrierObject.add(leg);}
    $('obstacle').textContent='× 장애물 제거';
  }
  const p=sim.obstacle.pos;barrierObject.position.set(p.x,.15,p.z);barrierObject.rotation.y=p.yaw;
}
function refreshRoutes(){
  remove3D(routeObject);routeObject=routeMeshes(scene,sim);removeBarrier();syncObstacle();
  palace.noFly.visible=sim.spec.restricted;
  updateEntities();updateReadouts();drawMiniMap();
}
function prepare(){
  const next=readSpec();
  sim.plan(next);refreshRoutes();
  message('경로 계산 완료 · 자동차와 드론을 출발 지점에 배치했습니다.');
  return true;
}
function start(){
  if(specChanged(readSpec()))prepare();
  sim.start();message('자율주행차·무인항공기 동시 출발');
}
function togglePause(){
  if(sim.running){sim.pause();message('일시 정지했습니다. 출발을 눌러 다시 진행하세요.');}
  else start();
}
function reset(){sim.reset();refreshRoutes();message('출발 위치로 초기화했습니다.');}
function obstacle(){try{sim.setObstacle();syncObstacle();message(sim.obstacle?'가상 전방 장애물을 배치했습니다.':'가상 장애물을 제거했습니다.');}catch(e){message(e.message,true);}}

function setView(value){
  if(!['over','car','drone','chase'].includes(value))return;
  view=value;currentPreset=value;
  document.querySelectorAll('button.view').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  if(value==='over'){
    orbit.enabled=!renderer.xr.isPresenting;
    camera.position.set(22,25,31);orbit.target.set(0,0,-3);
    camera.lookAt(0,0,-3);orbit.update();
  }else orbit.enabled=false;
  message(({over:'경복궁 전체 3D 관찰 시점',car:'자율주행차 앞 유리 HMD 시점',drone:'드론 전방 FPV 가상 카메라',chase:'자율주행차 후방 추적 시점'})[value]);
  hmd.draw(sim,view,{restricted:sim.spec.restricted,rate});
}
function updateEntities(){
  const cp=sim.car.pos,dp=sim.drone.pos;
  vehicle.group.position.set(cp.x,.16,cp.z);vehicle.group.rotation.y=cp.yaw;
  aircraft.group.position.set(dp.x,sim.drone.y,dp.z);aircraft.group.rotation.y=dp.yaw||0;
  vehicle.sensor.rotation.z+=.005;
}
function followCamera(dt){
  if(renderer.xr.isPresenting)return;
  if(view==='over'){orbit.update();return;}
  const c=vehicle.group,d=aircraft.group;
  if(view==='car'){
    const pos=c.localToWorld(new THREE.Vector3(0,1.25,-.12));
    const look=c.localToWorld(new THREE.Vector3(0,.98,-8));
    targetPos.copy(pos);targetLook.copy(look);
  }else if(view==='drone'){
    targetPos.copy(d.localToWorld(new THREE.Vector3(0,.2,.32)));
    targetLook.copy(d.localToWorld(new THREE.Vector3(0,-.48,-7.5)));
  }else{
    targetPos.copy(c.localToWorld(new THREE.Vector3(0,4,6)));
    targetLook.copy(c.localToWorld(new THREE.Vector3(0,.75,-1.0)));
  }
  const alpha=Math.min(1,dt*7);
  camera.position.lerp(targetPos,alpha);
  camera.lookAt(targetLook);
}
function updateReadouts(){
  $('carSpeed').textContent=(sim.car.v*3.6).toFixed(1);
  $('droneHeight').textContent=sim.drone.y.toFixed(1);
  $('carState').textContent=sim.car.state;$('droneState').textContent=sim.drone.phase;
  $('carDist').textContent=`${sim.car.s.toFixed(1)} / ${sim.routes.car.total.toFixed(1)} 장면 단위`;
  $('droneDist').textContent=`${sim.drone.s.toFixed(1)} / ${sim.routes.drone.total.toFixed(1)} 장면 단위`;
  $('carProgress').style.width=`${(sim.car.s/sim.routes.car.total*100).toFixed(1)}%`;
  $('droneProgress').style.width=`${(sim.drone.s/sim.routes.drone.total*100).toFixed(1)}%`;
  const mm=Math.floor(sim.elapsed/60),ss=Math.floor(sim.elapsed%60);
  $('timer').textContent=`${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  const eventText=sim.events.slice(-8).reverse().map(e=>`<p><strong>${e.time.toFixed(1)}s · ${e.who==='car'?'차량':e.who==='drone'?'드론':'시스템'}</strong>${e.message}</p>`).join('');
  if(eventText!==lastEvents){$('events').innerHTML=eventText;lastEvents=eventText;}
  hmd.draw(sim,view,{restricted:sim.spec.restricted,rate});
}
function drawMiniMap(){
  const canvas=$('minimap'),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  const X=x=>W/2+x*18.2,Z=z=>20+(z+22)*14.5;
  ctx.fillStyle='#d9e6da';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#e9dec2';ctx.fillRect(X(-12.5),Z(-21.3),25*18.2,40*14.5);
  ctx.strokeStyle='#aaa893';ctx.lineWidth=9;ctx.strokeRect(X(-12.5),Z(-21.3),25*18.2,40*14.5);
  ctx.fillStyle='#72a6b0';for(const [x,z,rx,rz] of [[-8,1,2.8,2.4],[4,-13.6,2.75,2.45]]){
    ctx.beginPath();ctx.ellipse(X(x),Z(z),rx*18.2,rz*14.5,0,0,Math.PI*2);ctx.fill();}
  ctx.textAlign='center';ctx.font='bold 17px sans-serif';
  for(const s of SITES){
    ctx.fillStyle=s.kind==='gate'?'#aa564b':'#926a4a';
    const w=s.kind==='pond'?38:55;
    ctx.fillRect(X(s.x)-w/2,Z(s.z)-14,w,28);
    ctx.fillStyle='#223d41';ctx.fillText(s.name,X(s.x),Z(s.z)-19);
  }
  const path=(points,color,dash)=>{
    if(!points?.length)return;
    ctx.beginPath();ctx.setLineDash(dash);ctx.strokeStyle=color;ctx.lineWidth=5;ctx.lineCap='round';
    points.forEach((p,i)=>{i?ctx.lineTo(X(p.x),Z(p.z)):ctx.moveTo(X(p.x),Z(p.z));});ctx.stroke();ctx.setLineDash([]);
  };
  path(sim.routes.car.points,'#06b7bd',[]);
  path(sim.routes.drone.points,'#f0a35c',[9,6]);
  const point=(p,col,r=8)=>{ctx.beginPath();ctx.arc(X(p.x),Z(p.z),r,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();};
  point(sim.car.pos,'#007e88',9);point(sim.drone.pos,'#fca052',9);
  if(sim.obstacle)point(sim.obstacle.pos,'#ff415b',9);
  if(sim.spec.restricted){ctx.setLineDash([7,6]);ctx.strokeStyle='#d48d62';ctx.lineWidth=2;for(const r of NO_FLY){ctx.beginPath();ctx.arc(X(r.x),Z(r.z),r.r*16,0,Math.PI*2);ctx.stroke();}ctx.setLineDash([]);}
}
function bind(){
  const on=(id,fn)=>$(id).addEventListener('click',()=>{try{fn();}catch(e){message(e.message,true);}});
  on('apply',prepare);on('start',start);on('pause',togglePause);on('reset',reset);on('obstacle',obstacle);
  on('same',()=>{$('droneFrom').value=$('carFrom').value;$('droneTo').value=$('carTo').value;message('자동차와 드론에 동일한 장소를 적용했습니다. 경로 계산을 누르세요.');});
  on('save',()=>{const blob=new Blob([JSON.stringify(sim.record(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='gyeongbokgung_virtual_mobility_log.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message('운행 JSON 기록을 다운로드했습니다.');});
  on('focusBtn',()=>setView(currentPreset));
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  $('rate').addEventListener('change',()=>{rate=Number($('rate').value);});
  $('night').addEventListener('change',()=>{night=$('night').checked;palace.lighting(sim.elapsed,night);});
  $('restricted').addEventListener('change',()=>{message('보호구역 우회 옵션을 변경했습니다. 경로 계산을 누르면 적용됩니다.');});
  $('mobileOpen').addEventListener('click',()=>$('leftPanel').classList.toggle('open'));
  document.querySelectorAll('#leftPanel button').forEach(b=>b.addEventListener('click',()=>{if(window.innerWidth<780&&b.id!=='same')$('leftPanel').classList.remove('open');}));
  window.addEventListener('keydown',e=>{
    if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;
    const v={'1':'over','2':'car','3':'drone','4':'chase'}[e.key];
    if(v)setView(v);
    if(e.code==='Space'){e.preventDefault();togglePause();}
    if(e.key.toLowerCase()==='h')setView(currentPreset);
    if(e.key.toLowerCase()==='o')obstacle();
    if(e.key==='Escape')$('leftPanel').classList.remove('open');
  });
}
function resize(){
  const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();hmd.layout(camera.aspect);
}
const sizeWatcher=new ResizeObserver(resize);sizeWatcher.observe(host);window.addEventListener('resize',resize);
bind();refreshRoutes();setView('over');palace.lighting(0,false);resize();message('3D 경복궁 가상도시 준비 완료 · 출발지와 도착지를 선택하세요.');
renderer.setAnimationLoop(time=>{
  const dt=Math.min(.05,(time-lastTime)/1000||.016);lastTime=time;
  if(sim.running)sim.update(dt*rate);
  vehicle.group.position.set(sim.car.pos.x,.16,sim.car.pos.z);
  vehicle.group.rotation.y=sim.car.pos.yaw;
  aircraft.group.position.set(sim.drone.pos.x,sim.drone.y,sim.drone.pos.z);
  aircraft.group.rotation.y=sim.drone.pos.yaw||0;
  for(const rotor of aircraft.rotors)rotor.rotation.y+=dt*(sim.drone.phase==='대기'?0.8:24);
  if(sim.obstacle&&!barrierObject)syncObstacle();
  palace.noFly.visible=sim.spec.restricted;
  palace.lighting(sim.elapsed,night);
  followCamera(dt);
  if(time-uiAt>140){uiAt=time;updateReadouts();drawMiniMap();}
  renderer.render(scene,camera);
});
