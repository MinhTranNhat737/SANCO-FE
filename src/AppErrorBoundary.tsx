import {Component,type ErrorInfo,type ReactNode} from 'react';

export default class AppErrorBoundary extends Component<{children:ReactNode},{error:Error|null}>{
  state:{error:Error|null}={error:null};
  static getDerivedStateFromError(error:Error){return {error};}
  componentDidCatch(error:Error,info:ErrorInfo){
    console.error('Sân Cờ render error:',error,info.componentStack);
    if(import.meta.env.DEV)void fetch('/__dev/client-errors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:error.message,stack:error.stack})}).catch(()=>{});
  }
  render(){
    if(this.state.error)return <main className="startup-message" role="alert"><span>SÂN CỜ</span><h1>Chưa mở được bàn cờ</h1><p>Tải lại để khôi phục. Ván đã lưu vẫn được giữ.</p><button onClick={()=>window.location.reload()}>Tải lại</button><button className="startup-secondary" onClick={()=>window.location.assign('/')}>Về sảnh</button>{import.meta.env.DEV&&<details><summary>Chi tiết lỗi</summary><pre>{this.state.error.message}</pre></details>}</main>;
    return this.props.children;
  }
}
