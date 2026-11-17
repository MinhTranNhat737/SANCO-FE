import {Component,type ReactNode} from 'react';

/** A failed WebGL module must leave the working 2D game available. */
export default class Board3DBoundary extends Component<{children:ReactNode;onFallback:()=>void},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error){console.error('3D board unavailable:',error);this.props.onFallback();}
  render(){return this.state.failed?null:this.props.children;}
}
