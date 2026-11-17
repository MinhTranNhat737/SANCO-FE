import {OrthographicCamera,Vector3} from 'three';
import {META,type GameKind} from '../practice-types.ts';

export const BOARD_SURFACE_Y=.3;
export function boardMetrics(kind:GameKind){
  const {cols,rows}=META[kind];
  return {cols,rows,width:cols+.9,depth:rows+.9};
}
export function boardPoint(kind:GameKind,index:number){
  const {cols,rows}=boardMetrics(kind);
  return new Vector3(index%cols-(cols-1)/2,BOARD_SURFACE_Y,Math.floor(index/cols)-(rows-1)/2);
}
export function fitBoardCamera(camera:OrthographicCamera,kind:GameKind,viewportWidth:number,viewportHeight:number,zoom=camera.zoom,extraPadding=0){
  const {width,depth}=boardMetrics(kind),aspect=Math.max(1,viewportWidth)/Math.max(1,viewportHeight);
  // A single world-unit projects to the same number of pixels on both axes.
  const viewHeight=Math.max(depth+.95+extraPadding,(width+.95+extraPadding)/aspect);
  camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;
  camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.zoom=zoom;
  camera.updateProjectionMatrix();
}
export function setBoardCamera(camera:OrthographicCamera,kind:GameKind,viewportWidth:number,viewportHeight:number,flipped:boolean,topView:boolean,zoom=1,extraPadding=0){
  const {width,depth}=boardMetrics(kind),sign=flipped?-1:1;
  fitBoardCamera(camera,kind,viewportWidth,viewportHeight,zoom,extraPadding);
  // Keep world Y as the orbit axis, including the nearly vertical preset.
  camera.up.set(0,1,0);
  if(topView){
    camera.position.set(0,25,.00001*sign);
  }else{
    // Centered on the player's side: horizontal ranks, no camera roll.
    // A higher elevation keeps the far ranks readable without flattening pieces.
    const distance=Math.max(width,depth);
    camera.position.set(0,BOARD_SURFACE_Y+distance*1.8,distance*.95*sign);
  }
  camera.lookAt(0,BOARD_SURFACE_Y,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
