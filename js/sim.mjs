/* 경복궁 '교육용 가상 공간' 지상·공중 운행 모델. 실제 도로/공역/허가 자료가 아니다.
   x=동서, z=남북(음수 북쪽), y=높이: 모두 게임 장면 단위. */
export const SITES = [
  {id:'gwang', name:'광화문',x:0,z:16, service:{x:-8,z:16},kind:'gate'},
  {id:'heung', name:'흥례문',x:0,z:12.4,service:{x:-8,z:13},kind:'gate'},
  {id:'geun', name:'근정전',x:0,z:6.6,service:{x:-8,z:7},kind:'hall'},
  {id:'sajeong',name:'사정전',x:0,z:1.7,service:{x:7,z:4},kind:'hall'},
  {id:'gyeong',name:'경회루',x:-8,z:1,service:{x:-11,z:4},kind:'pond'},
  {id:'gang',name:'강녕전',x:0,z:-3.7,service:{x:7,z:-5},kind:'hall'},
  {id:'gyo',name:'교태전',x:0,z:-7.5,service:{x:7,z:-8},kind:'hall'},
  {id:'hyang',name:'향원정',x:4,z:-13.6,service:{x:10,z:-14},kind:'pond'},
  {id:'geon',name:'건청궁',x:7,z:-17.3,service:{x:10,z:-17},kind:'hall'},
  {id:'folk',name:'국립민속박물관',x:11.9,z:-1.7,service:{x:10,z:-2},kind:'museum'},
  {id:'sinmu',name:'신무문',x:0,z:-20.2,service:{x:-8,z:-20},kind:'gate'}
];
export const X_GRID=[-11,-8,-5,-2,1,4,7,10];
export const Z_GRID=[-20,-17,-14,-11,-8,-5,-2,1,4,7,10,13,16];
export const NO_FLY=[
  {x:0,z:6.6,r:3.5,label:'근정전 보존구역'},
  {x:-8,z:1,r:3.0,label:'경회루 연못'},
  {x:4,z:-13.6,r:3.1,label:'향원정 연못'},
  {x:0,z:-3.7,r:2.5,label:'강녕전 보존구역'}
];
// 차로 통행 금지 구조물: 보호 공간 외측 '가상 관리 통로'만 생성.
const BLOCKS=[
  {x:0,z:16,w:6.4,d:2.4},{x:0,z:12.4,w:5.9,d:2.4},
  {x:0,z:6.6,w:5.6,d:3.5},{x:0,z:1.7,w:4.6,d:2.6},
  {x:0,z:-3.7,w:4.8,d:2.6},{x:0,z:-7.5,w:4.8,d:2.6},
  {x:7,z:-17.3,w:3.2,d:2.2},{x:11.9,z:-1.7,w:2.6,d:3.2}
];
const PONDS=[{x:-8,z:1,rx:2.8,rz:2.4},{x:4,z:-13.6,rx:2.75,rz:2.45}];
export const CONFIG={carCruise:4.0,turnSpeed:2.15,accel:2.0,brake:3.0,
  droneCruise:5.2,climb:2.3,descent:1.9,altitudes:[7,10,13]};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const key=(x,z)=>`${x},${z}`;
export function findSite(value){
  const query=String(value??'').trim().replace(/\s+/g,'');
  const s=SITES.find(v=>v.id===query||v.name.replace(/\s+/g,'')===query);
  if(!s)throw new Error(`등록 장소가 아닙니다: ${String(value??'').trim()||'(빈 입력)'}`);
  return s;
}
function blocked(p,margin=.18){
  if(BLOCKS.some(b=>Math.abs(p.x-b.x)<b.w/2+margin&&Math.abs(p.z-b.z)<b.d/2+margin))return true;
  return PONDS.some(l=>((p.x-l.x)/(l.rx+margin))**2+((p.z-l.z)/(l.rz+margin))**2<1);
}
function clearRoad(a,b){
  const d=distance(a,b),n=Math.max(1,Math.ceil(d/.35));
  for(let i=0;i<=n;i++){
    const t=i/n;if(blocked({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}))return false;
  }
  return true;
}
const ROAD_NODES=new Map();
for(const z of Z_GRID)for(const x of X_GRID)if(!blocked({x,z}))ROAD_NODES.set(key(x,z),{x,z});
export const ROAD_NET={nodes:[...ROAD_NODES.values()],edges:[]};
for(const p of ROAD_NET.nodes){
  for(const [dx,dz] of [[3,0],[0,3]]){
    const n=ROAD_NODES.get(key(p.x+dx,p.z+dz));if(n&&clearRoad(p,n))ROAD_NET.edges.push([p,n]);
  }
}
function graphSearch(startId,goalId,adj,coords){
  const open=new Set([startId]),g=new Map([[startId,0]]),from=new Map();
  while(open.size){
    let u=null,best=Infinity;for(const p of open){const f=g.get(p)+distance(coords.get(p),coords.get(goalId));if(f<best){best=f;u=p;}}
    if(u===goalId){const route=[u];while(from.has(route[0]))route.unshift(from.get(route[0]));return route;}
    open.delete(u);
    for(const [v,cost] of (adj.get(u)||[])){
      const next=g.get(u)+cost;if(next<(g.get(v)??Infinity)){g.set(v,next);from.set(v,u);open.add(v);}
    }
  }
  throw new Error('가상 경로를 찾을 수 없습니다.');
}
function routeData(points){
  if(points.length<2)throw new Error('경로 데이터가 부족합니다.');
  const dist=[0];for(let i=1;i<points.length;i++)dist.push(dist[i-1]+distance(points[i-1],points[i]));
  return {points,lengths:dist,total:dist.at(-1)};
}
export function sampleRoute(route,s){
  const q=clamp(s,0,route.total);
  let i=1;while(i<route.lengths.length-1&&route.lengths[i]<q)i++;
  const a=route.points[i-1],b=route.points[i],len=route.lengths[i]-route.lengths[i-1];
  const t=len?(q-route.lengths[i-1])/len:0;
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,yaw:Math.atan2(-(b.x-a.x),-(b.z-a.z))};
}
export function roadRoute(from,to){
  const p=findSite(from),q=findSite(to);
  if(p.id===q.id)throw new Error('차량 출발지와 도착지를 다르게 지정하세요.');
  const a=key(p.service.x,p.service.z),b=key(q.service.x,q.service.z);
  if(!ROAD_NODES.has(a)||!ROAD_NODES.has(b))throw new Error('지상 출발/도착 서비스 지점이 도로망에 없습니다.');
  const adj=new Map();for(const [u,v] of ROAD_NET.edges){const a=key(u.x,u.z),b=key(v.x,v.z);if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);const d=distance(u,v);adj.get(a).push([b,d]);adj.get(b).push([a,d]);}
  const ids=graphSearch(a,b,adj,ROAD_NODES);
  const route=routeData(ids.map(id=>({...ROAD_NODES.get(id)})));
  const signalPositions=[key(-8,7),key(7,4),key(7,-5),key(10,-14),key(-8,-11)];
  route.signals=ids.map((id,i)=>({id,i,s:route.lengths[i]})).filter(o=>o.i>0&&o.i<ids.length-1&&signalPositions.includes(o.id));
  route.corners=[];
  for(let i=1;i<route.points.length-1;i++){
    const a=route.points[i-1],c=route.points[i],b=route.points[i+1];
    const ax=c.x-a.x,az=c.z-a.z,bx=b.x-c.x,bz=b.z-c.z;
    if(ax*bx+az*bz===0)route.corners.push(route.lengths[i]);
  }
  return route;
}
export function airClear(a,b,zones=NO_FLY,pad=.34){
  const vx=b.x-a.x,vz=b.z-a.z,den=vx*vx+vz*vz;
  return zones.every(c=>{
    const t=den?clamp(((c.x-a.x)*vx+(c.z-a.z)*vz)/den,0,1):0;
    const dx=a.x+vx*t-c.x,dz=a.z+vz*t-c.z;
    return dx*dx+dz*dz>=(c.r+pad)**2-1e-7;
  });
}
function airBlocked(p){return NO_FLY.some(c=>Math.hypot(p.x-c.x,p.z-c.z)<c.r+.34);}
const AIR_X=Array.from({length:13},(_,i)=>-12+i*2);
const AIR_Z=Array.from({length:20},(_,i)=>-20+i*2);
const AIR_NODES=new Map();for(const z of AIR_Z)for(const x of AIR_X){const p={x,z};if(!airBlocked(p))AIR_NODES.set(key(x,z),p);}
export function airRoute(from,to,restricted=true,altitude=10){
  const a=findSite(from),b=findSite(to);
  if(a.id===b.id)throw new Error('드론 출발지와 도착지를 다르게 지정하세요.');
  if(!CONFIG.altitudes.includes(altitude))throw new Error('비행고도는 7·10·13 중 선택하세요(가상 장면 단위).');
  const start=a.service,end=b.service;
  if(!restricted||airClear(start,end))return {...routeData([start,end]),restricted,altitude,detour:false};
  if(airBlocked(start)||airBlocked(end))throw new Error('이착륙 가상 구역이 보호구역과 겹칩니다.');
  const adj=new Map(),coords=new Map(AIR_NODES);
  for(const p of AIR_NODES.values()){
    const u=key(p.x,p.z),list=[];
    for(const dx of [-2,0,2])for(const dz of [-2,0,2]){
      if(dx===0&&dz===0)continue;
      const n=AIR_NODES.get(key(p.x+dx,p.z+dz));
      if(n&&airClear(p,n))list.push([key(n.x,n.z),distance(p,n)]);
    }
    adj.set(u,list);
  }
  coords.set('@start',start);coords.set('@end',end);
  for(const [id,loc] of [['@start',start],['@end',end]]){
    const choices=[...AIR_NODES.entries()].filter(([k,p])=>distance(loc,p)<=4.5&&airClear(loc,p));
    adj.set(id,choices.map(([k,p])=>[k,distance(loc,p)]));
    for(const [k,p] of choices)adj.get(k).push([id,distance(p,loc)]);
  }
  if(airClear(start,end)){adj.get('@start').push(['@end',distance(start,end)]);}
  const route=graphSearch('@start','@end',adj,coords).map(id=>coords.get(id));
  // 시야선이 확보되는 멀리 떨어진 노드로 연결해 꺾임을 줄인다.
  const simplified=[route[0]];
  let i=0;while(i<route.length-1){let j=route.length-1;while(j>i+1&&!airClear(route[i],route[j]))j--;simplified.push(route[j]);i=j;}
  return {...routeData(simplified),restricted,altitude,detour:true};
}
export function signalColor(id,time){
  const shift=String(id).split('').reduce((n,ch)=>n+ch.charCodeAt(0),0)%5;
  const phase=(time+shift)%13;
  return phase<8?'green':phase<9.5?'yellow':'red';
}
export class Simulation{
  constructor(){this.plan({carFrom:'gwang',carTo:'hyang',droneFrom:'gwang',droneTo:'hyang',restricted:true,altitude:10});}
  plan(spec){
    const carFrom=findSite(spec.carFrom),carTo=findSite(spec.carTo),airFrom=findSite(spec.droneFrom),airTo=findSite(spec.droneTo);
    const carRoute=roadRoute(carFrom.id,carTo.id);
    const droneRoute=airRoute(airFrom.id,airTo.id,spec.restricted!==false,Number(spec.altitude??10));
    this.spec={carFrom:carFrom.id,carTo:carTo.id,droneFrom:airFrom.id,droneTo:airTo.id,restricted:droneRoute.restricted,altitude:droneRoute.altitude};
    this.routes={car:carRoute,drone:droneRoute};this.elapsed=0;this.running=false;this.obstacle=null;this.events=[];
    this.car={s:0,v:0,pos:sampleRoute(carRoute,0),state:'대기',stops:0,cleared:new Set(),arrival:null};
    this.drone={s:0,v:0,pos:{...droneRoute.points[0],yaw:0},y:.38,phase:'대기',timer:0,arrival:null};
    this.event('system','지상·공중 가상 경로 계산 완료');if(droneRoute.detour)this.event('drone','문화유산 보호구역을 우회하는 가상 비행 경로 선택');
  }
  event(who,message){this.events.push({time:Number(this.elapsed.toFixed(1)),who,message});if(this.events.length>110)this.events.shift();}
  start(){if(this.car.state==='도착'&&this.drone.phase==='도착')this.plan(this.spec);if(!this.running){this.running=true;if(this.car.state==='대기')this.car.state='출발';if(this.drone.phase==='대기'){this.drone.phase='이륙점검';this.drone.timer=.8;}this.event('system','동시 운행 시작');}}
  pause(){if(this.running){this.running=false;this.event('system','일시 정지');}}
  reset(){this.plan(this.spec);}
  setObstacle(){
    if(this.obstacle){this.obstacle=null;this.event('car','가상 장애물 제거');return;}
    const ahead=Math.max(5,this.car.v*this.car.v/(2*CONFIG.brake)+2.5);
    const s=this.car.s+ahead;if(s>this.routes.car.total-3)throw new Error('남은 구간이 짧습니다. 초기화 후 장애물을 추가하세요.');
    this.obstacle={s,pos:sampleRoute(this.routes.car,s)};this.event('car','차량 경로에 가상 장애물 설치');
  }
  update(dt){
    if(!this.running)return;
    let remaining=Math.min(Math.max(0,dt),2.5);
    while(remaining>1e-6){const step=Math.min(remaining,1/45);remaining-=step;this.elapsed+=step;this.updateCar(step);this.updateDrone(step);}
    if(this.car.state==='도착'&&this.drone.phase==='도착'){this.running=false;this.event('system','두 이동 수단이 목적지에 도착했습니다.');}
  }
  updateCar(dt){
    const c=this.car,r=this.routes.car;if(c.state==='도착')return;
    let stopAt=r.total,reason='도착';
    for(const gate of r.signals){
      if(c.cleared.has(gate.id))continue;
      if(c.s>gate.s-.68){c.cleared.add(gate.id);continue;}
      if(signalColor(gate.id,this.elapsed)!=='green'&&gate.s-.68<stopAt){stopAt=gate.s-.68;reason='신호 대기';}
      break;
    }
    if(this.obstacle&&this.obstacle.s-1.8>=c.s-.04&&this.obstacle.s-1.8<stopAt){stopAt=this.obstacle.s-1.8;reason='장애물 정지';}
    let target=CONFIG.carCruise;
    const corner=r.corners.find(v=>v>=c.s-.01);
    if(corner!==undefined)target=Math.min(target,Math.sqrt(CONFIG.turnSpeed**2+2*CONFIG.brake*Math.max(0,corner-c.s)));
    const gap=Math.max(0,stopAt-c.s);
    target=Math.min(target,Math.sqrt(2*CONFIG.brake*gap));
    const previous=c.v;
    c.v=previous<target?Math.min(target,previous+CONFIG.accel*dt):Math.max(target,previous-CONFIG.brake*dt);
    c.s=Math.min(stopAt,c.s+(previous+c.v)*.5*dt);
    c.pos=sampleRoute(r,c.s);
    if(stopAt-c.s<.004){c.s=stopAt;c.v=0;c.pos=sampleRoute(r,c.s);
      if(reason==='도착'){c.state='도착';c.arrival=this.elapsed;this.event('car','목적지 가상 정차 완료');}
      else if(c.state!==reason){if(reason==='신호 대기')c.stops++;c.state=reason;this.event('car',reason);}
    }else c.state=target<previous-.01?'감속':(corner!==undefined&&corner-c.s<1.2?'회전':'주행');
  }
  updateDrone(dt){
    const a=this.drone,r=this.routes.drone;if(a.phase==='도착')return;
    if(a.phase==='이륙점검'){a.timer-=dt;if(a.timer<=0){a.phase='수직 이륙';this.event('drone','수직 이륙 시작');}return;}
    if(a.phase==='수직 이륙'){a.y=Math.min(r.altitude,a.y+CONFIG.climb*dt);if(a.y>=r.altitude){a.phase='순항';this.event('drone','항공 경로 순항 시작');}return;}
    if(a.phase==='순항'){
      a.v=CONFIG.droneCruise;
      a.s=Math.min(r.total,a.s+a.v*dt);
      a.pos=sampleRoute(r,a.s);
      if(a.s>=r.total){a.v=0;a.phase='착륙 전 호버링';a.timer=1.0;this.event('drone','도착지 상공 정지비행');}
      return;
    }
    if(a.phase==='착륙 전 호버링'){a.timer-=dt;if(a.timer<=0){a.phase='수직 착륙';this.event('drone','수직 착륙 시작');}return;}
    if(a.phase==='수직 착륙'){a.y=Math.max(.38,a.y-CONFIG.descent*dt);if(a.y<=.38){a.phase='도착';a.arrival=this.elapsed;this.event('drone','이착륙장 도착 완료');}}
  }
  record(){return {kind:'virtual-heritage-digital-twin-demo',spec:this.spec,elapsed:this.elapsed,car:{distance:this.routes.car.total,progress:this.car.s,arrival:this.car.arrival,stops:this.car.stops},drone:{distance:this.routes.drone.total,progress:this.drone.s,arrival:this.drone.arrival,altitude:this.routes.drone.altitude},events:this.events};}
}
