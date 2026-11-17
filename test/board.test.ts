import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OrthographicCamera,Vector2,Vector3,Raycaster,Plane} from 'three';
import {boardMetrics,boardPoint,fitBoardCamera,setBoardCamera} from '../src/three/board-layout.ts';
import {BoardGesture} from '../src/three/board-gesture.ts';
import {transitionFor,sampleActor,incomingBoard,snapshot} from '../src/three/board-motion.ts';
import {GAME_KINDS,type GameKind,type PracticePly} from '../src/practice-types.ts';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

function board(length=64,entries:Record<number,string>={}){const out:(string|null)[]=Array(length).fill(null);for(const [index,piece]of Object.entries(entries))out[+index]=piece;return out;}
function move(before:(string|null)[],from:number|null,to:number,piece:string,at=1,extra:Partial<PracticePly>={}){
  const after=[...before];if(from!==null)after[from]=null;after[to]=piece;
  const ply:PracticePly={from,to,side:piece[0],piece,captured:before[to],label:'test',at,board:after,check:false,checkSquare:null,...extra};
  return ply;
}
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('Level preset resets a diagonal orbit to horizontal ranks and upright pieces without locking rotation',()=>{
  for(const kind of GAME_KINDS)for(const flipped of[false,true])for(const [width,height]of[[320,420],[998,588]]){
    const camera=new OrthographicCamera(-8,8,8,-8,.1,140),controls=new OrbitControls(camera);
    controls.target.set(0,.3,0);controls.maxPolarAngle=Math.PI/2-.12;
    camera.position.set(12,7,16);camera.lookAt(controls.target);controls.update();
    setBoardCamera(camera,kind,width,height,flipped,false,1.2);controls.update();camera.updateMatrixWorld(true);
    const pixel=(p:Vector3)=>{const n=p.clone().project(camera);return new Vector2(n.x*width/2,n.y*height/2);};
    const origin=pixel(new Vector3(0,.3,0)),rank=pixel(new Vector3(1,.3,0)).sub(origin),pieceUp=pixel(new Vector3(0,1.3,0)).sub(origin);
    near(rank.y,0);near(pieceUp.x,0);assert.ok(pieceUp.y>0);near(camera.zoom,1.2);
    assert.ok(controls.getPolarAngle()<Math.PI/4,'Raised default view must keep ranks readable');
    const radius=camera.position.distanceTo(controls.target),polar=controls.getPolarAngle(),angle=.6;
    camera.position.set(Math.sin(polar)*Math.sin(angle)*radius,.3+Math.cos(polar)*radius,Math.sin(polar)*Math.cos(angle)*radius);controls.update();
    near(controls.getAzimuthalAngle(),angle);assert.ok(controls.enableRotate);
  }
});

test('Resizing and zooming preserve an arbitrary orbit pose and accurate square picking',()=>{
  for(const kind of GAME_KINDS)for(const azimuth of[-Math.PI,-1.2,0,.7,Math.PI]){
    const camera=new OrthographicCamera(-8,8,8,-8,.1,140);
    camera.position.set(Math.sin(azimuth)*18,12,Math.cos(azimuth)*18);camera.lookAt(0,.3,0);camera.updateMatrixWorld(true);
    const position=camera.position.clone(),rotation=camera.quaternion.clone();
    for(const [width,height]of[[320,450],[1200,650]]){
      fitBoardCamera(camera,kind,width,height,1.3);
      assert.ok(camera.position.equals(position));assert.ok(camera.quaternion.equals(rotation));near(camera.zoom,1.3);
      near((camera.right-camera.left)/width,(camera.top-camera.bottom)/height);
      const {cols,rows}=boardMetrics(kind);
      for(const index of[0,Math.floor(cols*rows/2),cols*rows-1]){
        const point=boardPoint(kind,index),screen=point.clone().project(camera),ray=new Raycaster();
        ray.setFromCamera(new Vector2(screen.x,screen.y),camera);
        const hit=ray.ray.intersectPlane(new Plane(new Vector3(0,1,0),-.3),new Vector3())!;
        near(hit.distanceTo(point),0);
      }
    }
  }
});

test('Only a primary tap selects a square; drags, returning drags, pinches and cancellations do not',()=>{
  const g=new BoardGesture(),p=(pointerId=1,x=10,y=20,button=0)=>({pointerId,clientX:x,clientY:y,button});
  g.down(p());assert.equal(g.up(p(1,12,21)),true);
  g.down(p());g.move(p(1,50));assert.equal(g.up(p()),false);
  g.down(p());assert.equal(g.up(p(1,50)),false);
  g.down(p());g.down(p(2));assert.equal(g.up(p(2)),false);assert.equal(g.up(p()),false);
  g.down(p());g.cancel(p());assert.equal(g.up(p()),false);
  for(const button of[1,2]){g.down(p(1,10,20,button));assert.equal(g.up(p(1,10,20,button)),false);}
  g.down(p());assert.equal(g.up(p()),true);
});

test('Standard camera keeps horizontal and vertical unit lengths identical at every viewport and orientation',()=>{
  for(const kind of GAME_KINDS)for(const [width,height]of[[320,420],[640,480],[1200,650],[715.4,559.333]])for(const flipped of[false,true]){
    const camera=new OrthographicCamera(-8,8,8,-8,.1,140);setBoardCamera(camera,kind,width,height,flipped,true);
    const pixel=(point:Vector3)=>{const ndc=point.clone().project(camera);return new Vector2(ndc.x*width/2,ndc.y*height/2);};
    const origin=pixel(new Vector3(0,.3,0)),x=pixel(new Vector3(1,.3,0)).sub(origin),z=pixel(new Vector3(0,.3,1)).sub(origin);
    near(x.length(),z.length());near(x.dot(z),0);
    const {width:w,depth:d}=boardMetrics(kind);
    for(const sx of[-1,1])for(const sz of[-1,1]){const ndc=new Vector3(sx*(w+.65)/2,.3,sz*(d+.65)/2).project(camera);assert.ok(Math.abs(ndc.x)<1&&Math.abs(ndc.y)<1,'Board frame must fit the viewport');}
  }
});
test('Orthographic boards retain equal parallel opposite edges at every supported orbit angle',()=>{
  for(const kind of GAME_KINDS)for(const angle of[-1.1,0,.8])for(const polar of[.000001,.5,Math.PI/3]){
    const camera=new OrthographicCamera(-8,8,8,-8,.1,140),{width,depth}=boardMetrics(kind);
    camera.position.set(25*Math.sin(polar)*Math.sin(angle),.3+25*Math.cos(polar),25*Math.sin(polar)*Math.cos(angle));camera.lookAt(0,.3,0);camera.updateMatrixWorld(true);fitBoardCamera(camera,kind,998,588);
    const points=[[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]].map(([x,z])=>{const p=new Vector3(x,.3,z).project(camera);return new Vector2(p.x*499,p.y*294);});
    near(points[1].clone().sub(points[0]).distanceTo(points[2].clone().sub(points[3])),0);
    near(points[3].clone().sub(points[0]).distanceTo(points[2].clone().sub(points[1])),0);
  }
});
test('Screen picking returns the exact board square after resizing, zooming and flipping',()=>{
  for(const kind of GAME_KINDS)for(const flipped of[false,true])for(const zoom of[.7,1,1.6]){
    const {cols,rows}=boardMetrics(kind),camera=new OrthographicCamera(-8,8,8,-8,.1,140);setBoardCamera(camera,kind,393,517,flipped,true,zoom);
    for(const index of[0,cols-1,Math.floor(cols*rows/2),cols*rows-1]){
      const projected=boardPoint(kind,index).project(camera),ray=new Raycaster();ray.setFromCamera(new Vector2(projected.x,projected.y),camera);
      const hit=ray.ray.intersectPlane(new Plane(new Vector3(0,1,0),-.3),new Vector3())!;
      const col=Math.round(hit.x+(cols-1)/2),row=Math.round(hit.z+(rows-1)/2);near(row*cols+col,index);
    }
  }
});
test('All sixteen board layouts keep their exact dimensions and square cells',()=>{
  for(const [kind,cols,rows]of[['chess',8,8],['xiangqi',9,10],['caro',15,15],['reversi',8,8],['connect4',7,6],['go',9,9],['checkers',8,8],['tictactoe',3,3],['ludo',15,15],['monopoly',13,13],['coganh',5,5],['ataxx',7,7],['breakthrough',8,8],['loa',8,8],['isolation',8,8],['commander',11,12]] as const){const metrics=boardMetrics(kind);assert.equal(metrics.cols,cols);assert.equal(metrics.rows,rows);near(boardPoint(kind,1).distanceTo(boardPoint(kind,0)),1);near(boardPoint(kind,cols).distanceTo(boardPoint(kind,0)),1);}
});

test('Disc animations preserve all captured flips and the exact Connect Four landing square',()=>{
  const before=board(64,{27:'W',28:'B',35:'B',36:'W'}),ply=move(before,null,19,'B');ply.board[27]='B';ply.flips=[27];
  const plan=transitionFor('reversi',before,ply.board,ply)!;assert.ok(plan);assert.equal(plan.actors.length,2);assert.equal(plan.actors[1].finalPiece,'B');
  const untracked={...ply,flips:[]};assert.equal(transitionFor('reversi',before,ply.board,untracked),null);
  const empty=board(42),drop=move(empty,null,38,'R'),fall=transitionFor('connect4',empty,drop.board,drop)!;assert.ok(fall);
  const actor=fall.actors[0],end=sampleActor(actor,7,6,actor.duration);near(end.x,boardPoint('connect4',38).x);near(end.z,boardPoint('connect4',38).z);near(end.y,.3);
});
test('Ordinary move lifts in place, travels above the board, then lands at the exact destination',()=>{
  const before=board(64,{56:'wR'}),ply=move(before,56,32,'wR'),plan=transitionFor('chess',before,ply.board,ply)!;assert.ok(plan);
  const actor=plan.actors[0],start=sampleActor(actor,8,8,0),lift=sampleActor(actor,8,8,actor.duration*.12),travel=sampleActor(actor,8,8,actor.duration*.5),drop=sampleActor(actor,8,8,actor.duration*.9),end=sampleActor(actor,8,8,actor.duration);
  near(start.x,lift.x);near(start.z,lift.z);assert.ok(lift.y>start.y);near(travel.y,.3+actor.height);near(drop.x,end.x);near(drop.z,end.z);assert.ok(drop.y>.3);near(end.y,.3);near(end.x,boardPoint('chess',32).x);near(end.z,boardPoint('chess',32).z);
});
test('Knights follow an L-shaped path high enough to clear other pieces',()=>{
  for(const [kind,length,from,to]of[['chess',64,62,45],['xiangqi',90,82,63]] as const){
    const piece=kind==='chess'?'wN':'rN',before=board(length,{[from]:piece}),ply=move(before,from,to,piece),plan=transitionFor(kind,before,ply.board,ply)!;assert.ok(plan);assert.equal(plan.actors[0].path,'knight');
    const actor=plan.actors[0],{cols,rows}=boardMetrics(kind),fromPoint=boardPoint(kind,from),toPoint=boardPoint(kind,to);
    for(let p=.25;p<.76;p+=.025){const sample=sampleActor(actor,cols,rows,p*actor.duration);assert.ok(Math.abs(sample.x-fromPoint.x)<1e-8||Math.abs(sample.z-toPoint.z)<1e-8,'The long vertical leg must precede the short horizontal leg');near(sample.y,.3+actor.height);}
  }
});
test('Castling animates both king and rook, with rook clearance and delayed travel',()=>{
  const before=board(64,{60:'wK',63:'wR'}),ply=move(before,60,62,'wK');ply.board[63]=null;ply.board[61]='wR';
  const plan=transitionFor('chess',before,ply.board,ply)!;assert.ok(plan);assert.equal(plan.actors.length,2);assert.deepEqual(plan.actors.map(a=>[a.from,a.to]),[[60,62],[63,61]]);assert.ok(plan.actors[1].delay+plan.actors[1].duration*.24>=plan.actors[0].duration);assert.ok(plan.actors[1].height>=2);assert.equal(plan.duration,1440);
});
test('En passant removes its captured pawn and promotion moves the pawn before changing its model',()=>{
  const before=board(64,{28:'wP',27:'bP'}),ep=move(before,28,19,'wP');ep.board[27]=null;
  assert.deepEqual(transitionFor('chess',before,ep.board,ep)!.captures,[27]);
  const pawn=board(64,{8:'wP'}),promotion=move(pawn,8,0,'wP',2,{promotion:'n'});promotion.board[0]='wN';
  const actor=transitionFor('chess',pawn,promotion.board,promotion)!.actors[0];assert.equal(actor.piece,'wP');assert.equal(actor.finalPiece,'wN');
});
test('Invalid or unexplained board changes never get a move animation',()=>{
  const before=board(64,{56:'wR'}),diagonal=move(before,56,49,'wR');assert.equal(transitionFor('chess',before,diagonal.board,diagonal),null);
  const legal=move(before,56,32,'wR');legal.board[12]='bQ';assert.equal(transitionFor('chess',before,legal.board,legal),null);
  const empty=board(),forged=move(empty,56,32,'wR');assert.equal(transitionFor('chess',empty,forged.board,forged),null);
});
test('Identical polling snapshots do not replay the last move',()=>{
  const before=board(64,{56:'wR'}),ply=move(before,56,32,'wR'),history=[ply],received=snapshot('g1',ply.board,1,history);
  const result=incomingBoard('chess',received,snapshot('g1',[...ply.board],1,[{...ply,board:[...ply.board]}]),history);assert.equal(result.mode,'unchanged');assert.equal(result.steps.length,0);
});
test('A fast bot response appends a second transition instead of skipping the human animation',()=>{
  const before=board(64,{56:'wR',7:'bR'}),first=move(before,56,32,'wR'),second=move(first.board,7,23,'bR',2),history=[first,second];
  const s0=snapshot('g1',before,0,history),s1=snapshot('g1',first.board,1,history),s2=snapshot('g1',second.board,2,history);
  const human=incomingBoard('chess',s0,s1,history),bot=incomingBoard('chess',s1,s2,history);assert.equal(human.mode,'animate');assert.equal(bot.mode,'animate');assert.deepEqual(human.steps[0].after,bot.steps[0].before);
  const batched=incomingBoard('chess',s0,s2,history);assert.equal(batched.mode,'animate');assert.equal(batched.steps.length,2);
  assert.equal(incomingBoard('chess',s2,s0,history).mode,'snap');
});
test('New games, undo and missing history synchronize directly without inventing moves',()=>{
  const before=board(64,{56:'wR'}),ply=move(before,56,32,'wR'),history=[ply],start=snapshot('g1',before,0,history),end=snapshot('g1',ply.board,1,history);
  assert.equal(incomingBoard('chess',null,end,history).mode,'snap');assert.equal(incomingBoard('chess',end,start,history).mode,'snap');assert.equal(incomingBoard('chess',start,{...end,key:'g2'},history).mode,'snap');assert.equal(incomingBoard('chess',start,end,[]).mode,'snap');
});
