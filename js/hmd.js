import * as THREE from 'three';
import {SITES} from './sim.mjs';

function frame(ctx,w,h,title){
  ctx.clearRect(0,0,w,h);
  const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'rgba(6,30,40,.86)');g.addColorStop(1,'rgba(9,44,54,.69)');
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(7,7,w-14,h-14,25);ctx.fill();
  ctx.strokeStyle='rgba(90,239,224,.67)';ctx.lineWidth=4;ctx.stroke();
  ctx.fillStyle='#cae6dd';ctx.font='700 37px "Noto Sans CJK KR","Malgun Gothic",sans-serif';ctx.fillText(title,37,68);
  ctx.fillStyle='rgba(82,213,195,.23)';ctx.fillRect(35,87,w-70,3);
  ctx.fillStyle='#83a8b3';ctx.font='19px sans-serif';ctx.fillText('GYEONGBOKGUNG  /  XR LAB',37,h-33);
}
function txt(ctx,s,x,y,size=27,color='#eaf7f4',weight=500){
  ctx.font=`${weight} ${size}px "Noto Sans CJK KR", "Malgun Gothic",sans-serif`;
  ctx.fillStyle=color;ctx.fillText(s,x,y);
}
function button(ctx,label,x,y,w,h,active=false){
  ctx.fillStyle=active?'rgba(33,185,162,.76)':'rgba(83,148,153,.20)';
  ctx.strokeStyle=active?'#9efbe5':'rgba(108,228,220,.30)';ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(x,y,w,h,13);ctx.fill();ctx.stroke();
  txt(ctx,label,x+18,y+h*.68,22,active?'#072e34':'#e1f7f2',600);
}
function panel(camera,{x,y,z,w,h,rotate=0,canvasW=650,canvasH=900}){
  const canvas=document.createElement('canvas');canvas.width=canvasW;canvas.height=canvasH;
  const ctx=canvas.getContext('2d');const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide,opacity:.96});
  const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=rotate;camera.add(group);
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);surface.renderOrder=100;group.add(surface);
  const frameEdges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w,h)),new THREE.LineBasicMaterial({color:0x58e5d7,transparent:true,opacity:.22}));
  frameEdges.position.z=.008;frameEdges.renderOrder=101;group.add(frameEdges);
  return {group,canvas,ctx,map,w,h,canvasW,canvasH};
}
export function createHMD(camera){
  const left=panel(camera,{x:-1.20,y:0,z:-2.82,w:1.12,h:1.78,rotate:.17});
  const right=panel(camera,{x:1.20,y:0,z:-2.82,w:1.12,h:1.78,rotate:-.17});
  const upper=panel(camera,{x:0,y:1.09,z:-2.88,w:1.78,h:.35,canvasW:900,canvasH:210});
  const lower=panel(camera,{x:0,y:-1.0,z:-2.90,w:1.85,h:.36,canvasW:960,canvasH:215});
  const hitMeshes=[];
  function hotspot(p,x,y,w,h,action){
    const q=new THREE.Mesh(new THREE.PlaneGeometry(w/p.canvasW*p.w,h/p.canvasH*p.h),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,depthTest:false,side:THREE.DoubleSide}));
    q.position.set((x+w/2-p.canvasW/2)*p.w/p.canvasW,(p.canvasH/2-y-h/2)*p.h/p.canvasH,.023);
    q.userData.action=action;p.group.add(q);hitMeshes.push(q);return q;
  }
  // Left screen controls: scan / switch site / apply / start pause reset
  hotspot(left,33,160,584,68,'cycle-from');hotspot(left,33,242,584,68,'cycle-to');
  hotspot(left,33,354,584,72,'build');hotspot(left,33,439,584,72,'start');
  hotspot(left,33,527,584,72,'pause');hotspot(left,33,615,584,72,'reset');
  hotspot(right,33,543,274,74,'view-car');hotspot(right,320,543,297,74,'view-drone');
  hotspot(right,33,634,274,74,'view-chase');hotspot(right,320,634,297,74,'view-over');
  const draw=(sim,view,setting)=>{
    {
      const p=left,{ctx:c,canvasW:w,canvasH:h}=p;frame(c,w,h,'경복궁 · 이동 계획');
      txt(c,'선택 장소',36,139,21,'#91bfb5');
      button(c,`출발  ${SITES.find(s=>s.id===sim.spec.carFrom)?.name||'-'}   ↻`,33,160,584,68);
      button(c,`도착  ${SITES.find(s=>s.id===sim.spec.carTo)?.name||'-'}   ↻`,33,242,584,68);
      txt(c,'HMD 버튼: 자동차·드론 공통 위치 순환',35,334,19,'#8bb4b4');
      button(c,'경로 다시 계산',33,354,584,72);
      button(c,sim.running?'운행 중':'▶  동시 출발 / 재개',33,439,584,72,sim.running);
      button(c,'Ⅱ   일시 정지',33,527,584,72);
      button(c,'↺  출발 위치로 초기화',33,615,584,72);
      txt(c,'컴퓨터에서 좌측 입력창으로 별도 경로 지정',35,747,19,'#a7c5c4');
      txt(c,'차량: 가상 관리 통로   드론: 가상 비행',35,786,19,'#a7c5c4');
      p.map.needsUpdate=true;
    }
    {
      const p=right,{ctx:c,canvasW:w,canvasH:h}=p;frame(c,w,h,'운행 관제 · 센서 HUD');
      txt(c,'지상 자율주행차',38,143,26,'#5ee8dd',700);
      txt(c,`속도  ${(sim.car.v*3.6).toFixed(1)} km/h (가상)`,40,200,24);
      txt(c,`이동  ${sim.car.s.toFixed(1)} / ${sim.routes.car.total.toFixed(1)}`,40,246,23);
      txt(c,`상태  ${sim.car.state}`,40,296,23,'#f4deb4');
      c.strokeStyle='rgba(92,225,216,.35)';c.beginPath();c.moveTo(32,327);c.lineTo(617,327);c.stroke();
      txt(c,'공중 무인항공기',38,377,26,'#ffcb91',700);
      txt(c,`고도  ${sim.drone.y.toFixed(1)} 장면 단위`,40,430,23);
      txt(c,`이동  ${sim.drone.s.toFixed(1)} / ${sim.routes.drone.total.toFixed(1)}`,40,470,23);
      txt(c,`상태  ${sim.drone.phase}`,40,520,22,'#f4deb4');
      button(c,'자동차 시점',33,543,274,74,view==='car');
      button(c,'드론 시점',320,543,297,74,view==='drone');
      button(c,'추적 시점',33,634,274,74,view==='chase');
      button(c,'도시 전체',320,634,297,74,view==='over');
      txt(c,setting.restricted?'가상 보호구역 우회 적용':'가상 보호구역 우회 해제',38,756,20,'#d5e6de');
      txt(c,`시간 ${sim.elapsed.toFixed(1)}s   ·   배속 ${setting.rate}×`,38,792,20);
      p.map.needsUpdate=true;
    }
    {
      const p=upper,{ctx:c,canvasW:w,canvasH:h}=p;c.clearRect(0,0,w,h);
      c.fillStyle='rgba(6,33,43,.70)';c.beginPath();c.roundRect(6,8,w-12,h-16,28);c.fill();
      c.strokeStyle='#6fe8dc';c.lineWidth=4;c.stroke();
      txt(c,'GYEONGBOKGUNG   ·   HERITAGE DIGITAL TWIN',30,82,40,'#e6f7ef',700);
      txt(c,'3D 가상 체험 / 실제 비행·차량 운행 불가',30,152,34,'#f6ce95');p.map.needsUpdate=true;
    }
    {
      const p=lower,{ctx:c,canvasW:w,canvasH:h}=p;c.clearRect(0,0,w,h);
      c.fillStyle='rgba(6,31,42,.75)';c.beginPath();c.roundRect(6,8,w-12,h-16,28);c.fill();
      c.strokeStyle='#75f1de';c.lineWidth=4;c.stroke();
      txt(c,`CAR  ${sim.car.state}    |    UAV  ${sim.drone.phase}`,34,94,39,'#f1fff6',700);
      txt(c,`${SITES.find(s=>s.id===sim.spec.carFrom)?.name}  →  ${SITES.find(s=>s.id===sim.spec.carTo)?.name}`,34,156,36,'#8cece7');
      p.map.needsUpdate=true;
    }
  };
  function setVisible(value){for(const o of [left,right,upper,lower])o.group.visible=value;}
  function layout(aspect){
    const narrow=aspect<.72;
    const shift=narrow?.54:Math.min(1.26,Math.max(1.04,aspect*1.12));
    left.group.position.x=-shift;right.group.position.x=shift;
    left.group.scale.setScalar(narrow?.73:1);
    right.group.scale.setScalar(narrow?.73:1);
    // 휴대폰은 중앙 상단 배너가 잘리지 않도록 크기를 줄인다.
    upper.group.scale.setScalar(narrow?.70:1);
    lower.group.scale.setScalar(narrow?.76:1);
  }
  return {left,right,upper,lower,hitMeshes,draw,setVisible,layout};
}
