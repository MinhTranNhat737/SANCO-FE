type Pointer={pointerId:number;clientX:number;clientY:number;button:number};

// Track the entire gesture: returning to the start after rotating is still a drag.
export class BoardGesture {
  private pointers=new Set<number>();
  private candidate:{id:number;x:number;y:number;dragged:boolean}|null=null;
  down(event:Pointer){
    this.pointers.add(event.pointerId);
    if(this.pointers.size===1&&event.button===0)this.candidate={id:event.pointerId,x:event.clientX,y:event.clientY,dragged:false};
    else this.candidate=null;
  }
  move(event:Pointer){
    const c=this.candidate;
    if(c?.id===event.pointerId&&Math.hypot(event.clientX-c.x,event.clientY-c.y)>7)c.dragged=true;
  }
  up(event:Pointer){
    this.move(event);
    const click=event.button===0&&this.candidate?.id===event.pointerId&&!this.candidate.dragged&&this.pointers.size===1;
    this.pointers.delete(event.pointerId);this.candidate=null;
    return click;
  }
  cancel(event:Pick<Pointer,'pointerId'>){this.pointers.delete(event.pointerId);this.candidate=null;}
}
