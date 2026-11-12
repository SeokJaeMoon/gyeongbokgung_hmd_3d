import test from 'node:test';
import assert from 'node:assert/strict';
import {SITES,roadRoute,airRoute,airClear,findSite,Simulation,ROAD_NET} from '../js/sim.mjs';

test('유적 11곳과 관리 도로망 연결',()=>{
 assert.equal(SITES.length,11);
 assert(ROAD_NET.nodes.length>=60 && ROAD_NET.edges.length>=100);
 for(const p of SITES)assert.equal(findSite(p.name).id,p.id);
});

test('11*10=110쌍 차량 A* 가상 경로',()=>{
 let count=0;for(const a of SITES)for(const b of SITES)if(a!==b){const r=roadRoute(a.id,b.id);assert(r.total>0);assert(r.points.length>=2);count++;}
 assert.equal(count,110);
});

test('드론 제한구역 적용/해제, 3개 고도 전체 조합',()=>{
 let count=0;for(const a of SITES)for(const b of SITES)if(a!==b){
  for(const altitude of [7,10,13])for(const restricted of [false,true]){
   const r=airRoute(a.id,b.id,restricted,altitude);
   assert(r.total>0);
   if(restricted)for(let i=1;i<r.points.length;i++)assert(airClear(r.points[i-1],r.points[i]),`${a.id}-${b.id} segment ${i}`);
   count++;
  }
 }assert.equal(count,660);
});

test('출발/도착 위치 동일, 잘못된 장소를 거부',()=>{
 assert.throws(()=>roadRoute('gwang','gwang'));
 assert.throws(()=>airRoute('unknown','geun'));
 assert.throws(()=>airRoute('gwang','hyang',true,11));
});

test('실행 중 잘못된 재계획은 기존 경로 보존',()=>{
 const s=new Simulation(),old=s.spec.carFrom;
 assert.throws(()=>s.plan({...s.spec,carFrom:'geun',carTo:'geun'}));
 assert.equal(s.spec.carFrom,old);
});

test('자동차·드론이 동시에 출발하여 도착',()=>{
 const s=new Simulation();s.start();
 for(let i=0;i<10000&&s.running;i++)s.update(.04);
 assert.equal(s.car.state,'도착');assert.equal(s.drone.phase,'도착');
 assert(Math.abs(s.car.s-s.routes.car.total)<.03);assert(Math.abs(s.drone.s-s.routes.drone.total)<.03);
 assert(s.drone.arrival>0&&s.car.arrival>0);
});

test('장애물을 설치하면 차량 정지, 제거하면 재출발',()=>{
 const s=new Simulation();s.start();for(let i=0;i<60;i++)s.update(.04);
 s.setObstacle();for(let i=0;i<1500&&s.car.state!=='장애물 정지';i++)s.update(.04);
 assert.equal(s.car.state,'장애물 정지');assert(s.obstacle);
 s.setObstacle();for(let i=0;i<3000&&s.car.state!=='도착';i++)s.update(.04);
 assert.equal(s.car.state,'도착');
});

test('일시정지 시 시간과 위치 유지',()=>{
 const s=new Simulation();s.start();s.update(.8);s.pause();
 const prev=s.elapsed,pos=s.car.s;s.update(7);
 assert.equal(s.elapsed,prev);assert.equal(s.car.s,pos);
});

test('모든 출발·도착 조합의 종착 성공',()=>{
 for(const a of SITES)for(const b of SITES){if(a===b)continue;
  const s=new Simulation();s.plan({...s.spec,carFrom:a.id,carTo:b.id,droneFrom:a.id,droneTo:b.id});s.start();
  for(let i=0;i<8000&&s.running;i++)s.update(.05);
  assert.equal(s.car.state,'도착',`car ${a.id}->${b.id}: ${s.car.state}`);
  assert.equal(s.drone.phase,'도착',`drone ${a.id}->${b.id}: ${s.drone.phase}`);
 }
});
