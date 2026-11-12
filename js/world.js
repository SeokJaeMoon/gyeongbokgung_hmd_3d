import * as THREE from 'three';
import {SITES, ROAD_NET, NO_FLY, signalColor} from './sim.mjs';

const WORLD_NAMES={gwang:'광화문',heung:'흥례문',geun:'근정전',sajeong:'사정전',gyeong:'경회루',gang:'강녕전',gyo:'교태전',hyang:'향원정',geon:'건청궁',folk:'국립민속박물관',sinmu:'신무문'};
function mat(hex,rough=.77,metal=.02){return new THREE.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal});}
const M={stone:mat(0xbcb5a9),court:mat(0xd9c7a7),wall:mat(0xd9d0bb),grass:mat(0x7fa17a),
  red:mat(0x8f3239),pillar:mat(0xb6463f),teal:mat(0x176e67),mint:mat(0x68a7a3),gold:mat(0xc79e54),
  roof:mat(0x34434b,.65),roofAlt:mat(0x293940,.69),white:mat(0xe8dfce),wood:mat(0x785343),
  water:new THREE.MeshStandardMaterial({color:0x4e96aa,roughness:.17,metalness:.18,transparent:true,opacity:.89}),
  guide:new THREE.MeshBasicMaterial({color:0x5cd0db,transparent:true,opacity:.13,depthWrite:false})};
const boxGeo=new THREE.BoxGeometry(1,1,1);
function box(g,x,y,z,w,h,d,m){const o=new THREE.Mesh(boxGeo,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function cyl(g,x,y,z,r,h,m,n=12){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,n),m);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;}
function sphere(g,x,y,z,r,m,n=12){const o=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),m);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;}
function ellipse(g,x,z,rx,rz,color,y=.028){const o=new THREE.Mesh(new THREE.CircleGeometry(1,64),color);o.rotation.x=-Math.PI/2;o.scale.set(rx,rz,1);o.position.set(x,y,z);o.receiveShadow=true;g.add(o);return o;}
function labelTexture(text,color='#d6fcff',fill='rgba(8,27,34,.88)'){
  const c=document.createElement('canvas');c.width=640;c.height=150;const cx=c.getContext('2d');
  cx.fillStyle=fill;cx.beginPath();cx.roundRect(5,6,630,138,20);cx.fill();
  cx.strokeStyle=color;cx.lineWidth=5;cx.stroke();
  cx.fillStyle=color;cx.font='bold 76px "Noto Sans CJK KR", "Malgun Gothic", sans-serif';
  cx.textAlign='center';cx.textBaseline='middle';cx.fillText(text,320,78,580);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function makeLabel(text,x,y,z,color='#d6fcff',w=3.1){
  const map=labelTexture(text,color);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map,depthWrite:false,depthTest:true}));s.position.set(x,y,z);s.scale.set(w,w*.235,1);return s;
}
function tileRoof(g,w,d,topY,level=1){
  const eaveY=topY-.45,peakY=topY+.40, ww=w+.68,dd=d+.95;
  const vertices=new Float32Array([
    -ww/2,eaveY,-dd/2, ww/2,eaveY,-dd/2, ww/2,peakY,0,
    -ww/2,eaveY,-dd/2, ww/2,peakY,0, -ww/2,peakY,0,
    -ww/2,peakY,0, ww/2,peakY,0, ww/2,eaveY,dd/2,
    -ww/2,peakY,0, ww/2,eaveY,dd/2, -ww/2,eaveY,dd/2,
    -ww/2,eaveY,-dd/2, -ww/2,peakY,0, -ww/2,eaveY,dd/2,
    ww/2,eaveY,-dd/2, ww/2,eaveY,dd/2, ww/2,peakY,0
  ]);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(vertices,3));geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:level===2?0x283d45:0x364a50,roughness:.7,side:THREE.DoubleSide}));
  mesh.castShadow=true;g.add(mesh);
  for(const side of [-1,1]){
    box(g,0,eaveY-.035,side*dd/2,ww+.09,.13,.15,M.teal);
    box(g,0,eaveY-.13,side*dd/2,ww+.05,.09,.17,M.red);
    for(let i=1;i<14;i++){
      const x=-ww/2+i*ww/14;
      const pts=[new THREE.Vector3(x,peakY+.012,0),new THREE.Vector3(x,eaveY+.012,side*dd/2)];
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x62727c,transparent:true,opacity:.36}));g.add(line);
    }
  }
  box(g,0,peakY+.06,0,ww+.19,.14,.23,M.roofAlt);
  for(const side of [-1,1])box(g,side*ww/2,eaveY-.13,0,.15,.10,dd,M.gold);
  return topY+.42;
}
function hall(parent,x,z,w,d,h,options={}){
  const group=new THREE.Group();group.position.set(x,0,z);parent.add(group);
  box(group,0,.15,0,w+.95,.33,d+.82,M.stone);
  box(group,0,.34,0,w+.50,.12,d+.50,M.white);
  const pY=.39+(h-.40)/2;
  box(group,0,pY,0,w-.55,h-.65,d-.52,M.wood);
  // 창호 / 격자
  for(let q=-2;q<=2;q++){
    const xx=q*(w-.9)/5;
    box(group,xx,.88, -d/2-.004,.018,1.12,.055,M.white);
  }
  for(const side of [-1,1]){
    for(let i=0;i<Math.max(4,Math.round(w/.6));i++){
      const cx=(-w/2+.25)+i*(w-.5)/(Math.max(4,Math.round(w/.6))-1);
      cyl(group,cx,h/2+.29,side*(d/2-.1),.095,h-.30,M.pillar,12);
      cyl(group,cx,h-.03,side*(d/2-.1),.15,.13,M.teal,12);
    }
  }
  box(group,0,h-.12,0,w+.45,.16,d+.38,M.teal);
  box(group,0,h-.30,0,w+.35,.09,d+.18,M.red);
  tileRoof(group,w,d,h+.48,1);
  if(options.double){
    box(group,0,h+.66,0,w*.63,.33,d*.59,M.red);
    for(const u of [-1,1])for(const v of [-1,1])cyl(group,u*w*.27,h+1.04,v*d*.24,.09,.69,M.pillar);
    tileRoof(group,w*.72,d*.66,h+1.47,2);
  }
  // 앞쪽 계단
  for(let i=0;i<3;i++)box(group,0,.03+i*.065,-d/2-.62+i*.16,w*.28+i*.10,.08+i*.06,.45,M.stone);
  return group;
}
function gate(parent,x,z,w,level=1){
  const group=new THREE.Group();group.position.set(x,0,z);parent.add(group);
  box(group,0,.22,0,w+.65,.38,1.8,M.stone);
  for(const i of [-1,0,1]){
    const xx=i*w*.26;
    box(group,xx-.38,1.23,0,.3,2.0,.65,M.wall);
    box(group,xx+.38,1.23,0,.3,2.0,.65,M.wall);
    box(group,xx,2.27,0,.95,.24,.8,M.wall);
    box(group,xx,1.18,0,.69,1.8,.75,mat(0x242a31));
  }
  box(group,0,2.47,0,w+.55,.38,1.7,M.red);
  for(let i=0;i<6;i++)cyl(group,-w*.38+i*w*.76/5,2.8,.55,.09,.52,M.pillar);
  tileRoof(group,w+.45,2.1,3.11,1);
  if(level===2){for(let i=-2;i<=2;i++)cyl(group,i*w*.16,3.9,0,.085,.68,M.pillar);
    tileRoof(group,w*.86,1.72,4.50,2);}
  return group;
}
function tree(root,x,z,scale=1,color=0x56835c){
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);root.add(g);
  const leaf=mat(color,.9),trunk=mat(0x785843);
  cyl(g,0,.46,0,.07,.92,trunk);
  sphere(g,0,1.28,0,.62,leaf);sphere(g,.34,1.06,0,.38,leaf);
  sphere(g,-.3,1.1,.12,.41,leaf);return g;
}
function pond(parent,x,z,rx,rz){
  const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
  ellipse(g,0,0,rx+.24,rz+.23,M.stone,.042);
  ellipse(g,0,0,rx,rz,M.water,.052);
  for(let i=0;i<22;i++){
    const a=i/22*Math.PI*2,r=.78+(i%3)*.07;
    const p=new THREE.Mesh(new THREE.CircleGeometry(.12,12),mat(i%2?0x477e67:0x6db17f,.8));
    p.rotation.x=-Math.PI/2;p.position.set(Math.cos(a)*rx*r,.063,Math.sin(a)*rz*r);g.add(p);
  }
  return g;
}
function pavilion(parent,x,z,width=2.4,depth=2.2,hex=false){
  if(!hex)return hall(parent,x,z,width,depth,1.8,{double:true});
  const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
  cyl(g,0,.18,0,1.08,.35,M.stone,6);
  for(let k=0;k<6;k++){
    const a=k/6*2*Math.PI;
    cyl(g,Math.sin(a)*.74,.92,Math.cos(a)*.74,.07,1.5,M.pillar,10);
  }
  cyl(g,0,1.59,0,1.05,.16,M.teal,6);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.35,.74,6),M.roof);roof.position.y=2.02;roof.castShadow=true;g.add(roof);
  return g;
}
export function buildPalace(scene){
  scene.background=new THREE.Color(0xb9d8e3);scene.fog=new THREE.Fog(0xb9d8e3,45,105);
  const lights=new THREE.Group();scene.add(lights);
  const hemi=new THREE.HemisphereLight(0xeafcff,0x7d8678,2.2);lights.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff2d7,2.6);sun.position.set(-12,23,13);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-34;sun.shadow.camera.right=34;sun.shadow.camera.top=37;sun.shadow.camera.bottom=-37;
  sun.shadow.normalBias=.02;lights.add(sun);
  const world=new THREE.Group();scene.add(world);
  box(world,0,-.14,-1.4,90,.3,90,mat(0x6b8f7e));
  box(world,0,.01,-1.1,28,.15,43,M.grass);
  box(world,0,.09,6.3,18,.025,26.5,M.court);
  box(world,0,.09,-9.5,18,.025,20,M.court);
  // 동서 통행 구역 및 전각 광장 바닥 질감
  for(let i=-7;i<=7;i++)for(let j=0;j<20;j++)if(Math.abs(i)%3===0&&j%4===0)
    box(world,i*.94,.108,16-j*1.7,.87,.009,1.53,mat(0xd2c2a8));
  // 경복궁 성벽 (정확한 실측 복원이 아닌 학습형 배치)
  for(const x of [-13,13]){box(world,x,1.12,-1.1,.33,2.18,41.3,M.wall);box(world,x,2.22,-1.1,.57,.25,41.7,M.roof);}
  box(world,0,1.12,-22,26,.8,.35,M.wall);
  box(world,0,1.20,19.25,18,.90,.33,M.wall);
  for(const x of [-10.4,10.4])box(world,x,1.12,19.25,5,.90,.33,M.wall);
  // 문과 전각 축
  gate(world,0,16,5.8,2);
  gate(world,0,12.4,5.4,1);
  hall(world,0,6.6,5.7,3.5,2.3,{double:true});
  hall(world,0,1.7,4.35,2.6,1.85);
  hall(world,0,-3.7,4.7,2.65,1.9);
  hall(world,0,-7.5,4.5,2.5,1.9);
  gate(world,0,-20.2,5.6,1);
  hall(world,7,-17.3,3.5,2.4,1.65);
  hall(world,11.9,-1.7,3,3.0,2.0);
  // 전각 둘레 궁궐 구획
  for(const z of [9.5,3.6,-1.2,-5.6,-9.4]){
    box(world,-3.65,.88,z,.12,1.47,1.75,M.wall);box(world,3.65,.88,z,.12,1.47,1.75,M.wall);
  }
  // 경회루·향원정 연못
  pond(world,-8,1,2.8,2.4);
  pavilion(world,-8,1,2.30,2.0,false);
  box(world,-4.9,.21,.9,1.5,.16,.30,M.stone);
  pond(world,4,-13.6,2.75,2.45);
  pavilion(world,4,-13.6,0,0,true);
  box(world,6.7,.18,-13.6,1.8,.11,.25,M.stone);
  // 추가 행각
  hall(world,-5.3,-5.5,2.0,2.2,1.35);
  hall(world,5.6,-7.2,2.0,2.0,1.4);
  hall(world,-5.1,11,2.0,1.6,1.38);
  hall(world,6.9,8.6,2.5,1.9,1.5);
  // 나무와 정원
  let seed=17;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  for(let i=0;i<60;i++){
    const x=-12+rnd()*24,z=-21+rnd()*40;
    const near=([ ...SITES.map(p=>({x:p.x,z:p.z,r:p.kind==='pond'?4.0:3.2})),{x:-8,z:1,r:3.5},{x:4,z:-13.6,r:3.8}]).some(p=>Math.hypot(x-p.x,z-p.z)<p.r);
    if(near||Math.abs(x)<1.5&&z>-11&&z<17)continue;
    tree(world,x,z,.58+rnd()*.44,[0x55865b,0x7aa366,0x59896e,0x8a9e63,0xa8a067][i%5]);
  }
  // 경복궁 밖 현대 스마트시티 빌딩 스카이라인
  const glass=new THREE.MeshStandardMaterial({color:0x8aabb8,metalness:.35,roughness:.36});
  for(let i=0;i<28;i++){
    const angle=i/28*2*Math.PI,r=33+(i%4)*3,x=Math.sin(angle)*r,z=-4+Math.cos(angle)*r;
    const h=6+(i*11)%15,w=2.6+(i%3)*1.0,d=2.8+(i%4)*.7;
    box(world,x,h/2,z,w,h,d,glass);
    box(world,x,h+.12,z,w+.2,.22,d+.2,M.roofAlt);
    for(let j=0;j<Math.min(7,Math.floor(h/2));j++){
      box(world,x,h*.17+j*1.7,z+d/2+.01,w*.74,.055,.025,mat(0xd3eff7,.3));
    }
  }
  // 산 배경
  const mountainMat=mat(0x77988c,.96);for(let i=0;i<12;i++){
    const x=-65+i*12,z=-52-(i%3)*2,h=10+(i*7)%11;
    const mountain=new THREE.Mesh(new THREE.ConeGeometry(10,h,5),mountainMat);
    mountain.position.set(x,h/2-1,z);world.add(mountain);
  }
  // 역사 전각 라벨 / 출발·도착 패드
  const tags=new THREE.Group();world.add(tags);
  for(const s of SITES){
    tags.add(makeLabel(s.name,s.x,s.kind==='gate'?5.7:s.kind==='pond'?4.0:4.8,s.z));
    const pad=new THREE.Mesh(new THREE.RingGeometry(.34,.45,24),new THREE.MeshBasicMaterial({color:0x6ce4d2,side:THREE.DoubleSide,transparent:true,opacity:.75}));
    pad.rotation.x=-Math.PI/2;pad.position.set(s.service.x,.18,s.service.z);world.add(pad);
  }
  const roadLanes=new THREE.Group();world.add(roadLanes);
  for(const [a,b] of ROAD_NET.edges){
    const p=new THREE.Vector3(a.x,.142,a.z),q=new THREE.Vector3(b.x,.142,b.z);
    const dir=new THREE.Vector3().subVectors(q,p);const len=dir.length();
    const strip=new THREE.Mesh(new THREE.BoxGeometry(.51,.012,len),M.guide);
    strip.position.copy(p).add(q).multiplyScalar(.5);
    strip.rotation.y=Math.atan2(dir.x,dir.z);
    roadLanes.add(strip);
  }
  // 디지털 가상 교차로 신호 / 센서 (실제 궁내 존재 시설이 아님)
  const traffic=[];
  for(const [x,z] of [[-8,7],[7,4],[7,-5],[10,-14],[-8,-11]]){
    const g=new THREE.Group();g.position.set(x+.65,0,z+.65);world.add(g);
    cyl(g,0,.73,0,.046,1.46,M.roofAlt);
    box(g,0,1.42,0,.25,.48,.16,mat(0x1d343e));
    const lamp=sphere(g,0,1.48,.10,.095,mat(0x53f4ae));
    traffic.push({id:`${x},${z}`,lamp});
  }
  const noFly=new THREE.Group();world.add(noFly);
  for(const z of NO_FLY){
    const geom=new THREE.CylinderGeometry(z.r,z.r,6,50,1,true);
    const mesh=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({color:0xffae5c,transparent:true,opacity:.045,side:THREE.DoubleSide,depthWrite:false}));
    mesh.position.set(z.x,3.1,z.z);noFly.add(mesh);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(z.r,.043,7,64),new THREE.MeshBasicMaterial({color:0xffb069,transparent:true,opacity:.74}));
    ring.rotation.x=Math.PI/2;ring.position.set(z.x,6.18,z.z);noFly.add(ring);
  }
  function lighting(time,isNight){
    const n=Boolean(isNight);scene.background.set(n?0x203047:0xb9d8e3);scene.fog.color.set(n?0x203047:0xb9d8e3);
    hemi.intensity=n?1.15:2.2;sun.intensity=n?0.3:2.6;
    for(const t of traffic){t.lamp.material.color.set(signalColor(t.id,time)==='green'?0x56f5bc:signalColor(t.id,time)==='yellow'?0xffdd6f:0xff6570);}
  }
  return {world,tags,noFly,lighting,roadLanes};
}
export function makeCar(scene){
  const group=new THREE.Group();scene.add(group);
  const body=mat(0xf6f1e7,.34,.18),glass=new THREE.MeshStandardMaterial({color:0x275269,roughness:.16,metalness:.20,transparent:true,opacity:.88}),dark=mat(0x232e36,.65),led=new THREE.MeshBasicMaterial({color:0x68ebfe});
  box(group,0,.47,0,1.12,.33,2.04,body);
  box(group,0,.74,.11,1.02,.31,1.04,glass);
  box(group,0,.94,.13,1.0,.10,1.08,body);
  for(const x of [-.47,.47]){
    box(group,x,.42,-.92,.16,.10,.08,led);
    box(group,x,.44,.94,.15,.12,.08,mat(0xf7716f));
  }
  for(const x of [-.58,.58])for(const z of [-.65,.66]){
    const w=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.14,16),dark);
    w.position.set(x,.26,z);w.rotation.z=Math.PI/2;group.add(w);
  }
  cyl(group,0,1.08,.14,.15,.14,mat(0x879ba9));
  const sensor=new THREE.Mesh(new THREE.TorusGeometry(.37,.015,7,40),led);sensor.rotation.x=-Math.PI/2;sensor.position.y=1.14;group.add(sensor);
  return {group,sensor};
}
export function makeDrone(scene){
  const group=new THREE.Group();scene.add(group);
  const light=mat(0xf1f6f6,.36,.20),dark=mat(0x27363d,.52),led=mat(0xffc37e,.35,.18);
  box(group,0,0,0,.61,.26,.75,light);
  box(group,0,.17,0,.42,.09,.42,led);
  const rotors=[];
  for(const x of [-.66,.66])for(const z of [-.66,.66]){
    const length=Math.hypot(x,z);
    const arm=box(group,x/2,.05,z/2,.10,.10,length,dark);arm.rotation.y=Math.atan2(x,z);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.27,.018,7,28),light);
    ring.position.set(x,.12,z);ring.rotation.x=Math.PI/2;group.add(ring);
    const rotor=new THREE.Group();rotor.position.set(x,.12,z);
    box(rotor,0,0,0,.50,.016,.06,dark);box(rotor,0,0,0,.06,.016,.50,dark);group.add(rotor);rotors.push(rotor);
  }
  for(const x of [-.26,.26]){box(group,x,-.27,.12,.045,.49,.05,dark);box(group,x,-.47,.12,.055,.045,.74,dark);}
  sphere(group,0,-.17,-.38,.13,mat(0x1b303e));
  return {group,rotors};
}
export function routeMeshes(scene,sim){
  const all=new THREE.Group();scene.add(all);
  function pathLine(points,y,color,radius){
    const p=points.map(v=>new THREE.Vector3(v.x,y,v.z));
    if(p.length<2)return;
    const path=new THREE.CurvePath();for(let i=1;i<p.length;i++)path.add(new THREE.LineCurve3(p[i-1],p[i]));
    const tube=new THREE.Mesh(new THREE.TubeGeometry(path,Math.max(2,p.length*4),radius,6,false),new THREE.MeshBasicMaterial({color}));
    all.add(tube);
  }
  pathLine(sim.routes.car.points,.17,0x1bd5da,.09);
  const pts=sim.routes.drone.points;const h=sim.routes.drone.altitude;
  for(let i=1;i<pts.length;i++){
    const a=new THREE.Vector3(pts[i-1].x,h,pts[i-1].z),b=new THREE.Vector3(pts[i].x,h,pts[i].z);
    const geo=new THREE.CylinderGeometry(.055,.055,a.distanceTo(b),8);
    const obj=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xffaa66,transparent:true,opacity:.87}));
    obj.position.copy(a).add(b).multiplyScalar(.5);
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3().subVectors(b,a).normalize());all.add(obj);
  }
  for(const p of [pts[0],pts.at(-1)]){
    const cylLine=cyl(all,p.x,h/2+.15,p.z,.024,h,mat(0xffb16d,.4),10);cylLine.material.transparent=true;cylLine.material.opacity=.48;
  }
  for(const [from,to,c] of [[sim.spec.carFrom,sim.spec.carTo,0x49e5d6],[sim.spec.droneFrom,sim.spec.droneTo,0xffaa6b]]){
    const p=SITES.find(s=>s.id===from),q=SITES.find(s=>s.id===to);
    const tag=new THREE.Mesh(new THREE.SphereGeometry(.34,12,10),new THREE.MeshBasicMaterial({color:c}));tag.position.set(p.service.x,.30,p.service.z);all.add(tag);
    const e=new THREE.Mesh(new THREE.SphereGeometry(.27,12,10),new THREE.MeshBasicMaterial({color:0xff5d76}));e.position.set(q.service.x,.30,q.service.z);all.add(e);
  }
  return all;
}
export function remove3D(group){if(!group)return;group.traverse(o=>{if(o.geometry&&o.geometry!==boxGeo)o.geometry.dispose();if(o.material&&o.material!==M.guide){const a=Array.isArray(o.material)?o.material:[o.material];a.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});group.removeFromParent();}
