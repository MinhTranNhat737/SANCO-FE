import LanguageSwitch, { useWebsiteLanguage } from './LanguageSwitch';
import { getLanguage, t } from './language.ts';
import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Lightbulb,RotateCcw} from 'lucide-react';
import FlatBoard from './FlatBoard';
import {LESSONS,lessonFrames,lessonSquare,type LessonKind} from './lesson-data';
import {META,type PracticeMove} from './practice-types';

function readLocation(){
  const params=new URLSearchParams(window.location.search);
  const kind:LessonKind=params.get('mon')==='co-tuong'?'xiangqi':'chess';
  const chapter=Math.max(0,LESSONS[kind].findIndex(item=>item.id===params.get('chuong')));
  return {kind,chapter};
}

export default function Lessons(){
  useWebsiteLanguage();
  const [{kind,chapter},setChapter]=useState(readLocation);
  const [step,setStep]=useState(0),[selected,setSelected]=useState<number|null>(null);
  const [hint,setHint]=useState(false),[feedback,setFeedback]=useState('');
  const lessons=LESSONS[kind],lesson=lessons[chapter];
  const frames=useMemo(()=>lessonFrames(kind,lesson),[kind,lesson]);
  const move=lesson.moves[step],last=lesson.moves[step-1],done=!move;
  const square=(value:string)=>lessonSquare(kind,value);
  const lastMove:PracticeMove|null=last?{from:square(last.from),to:square(last.to)}:null;

  function showStep(next:number){
    setStep(next);setSelected(null);setHint(false);setFeedback('');
  }
  function openChapter(nextKind:LessonKind,nextChapter:number){
    setChapter({kind:nextKind,chapter:nextChapter});showStep(0);
    const search=new URLSearchParams({mon:nextKind==='chess'?'co-vua':'co-tuong',chuong:LESSONS[nextKind][nextChapter].id});
    history.pushState(null,'',`?${search}`);
  }
  useEffect(()=>{
    const restore=()=>{setChapter(readLocation());showStep(0);};
    window.addEventListener('popstate',restore);
    return ()=>window.removeEventListener('popstate',restore);
  },[]);

  function pick(index:number){
    if(!move)return;
    if(selected===square(move.from)&&index===square(move.to)){showStep(step+1);return;}
    if(index===square(move.from)){
      setSelected(selected===index?null:index);setFeedback('');return;
    }
    setSelected(null);setFeedback('Thử lại theo yêu cầu của chương, hoặc xem gợi ý.');
  }

  return <div className="compact-interface lessons-shell">
    <header className="lessons-top"><a href="/" className="lesson-brand"><img src="/thumbs/sanco-brand.jpg" width="34" height="34" alt=""/>Sân Cờ</a><div className="lessons-top-actions"><a href="/" className="lesson-back"><ArrowLeft size={16}/>{' ' + t('Trang chủ')}</a><LanguageSwitch/></div></header>
    <main className="lessons-content">
      <div className="lessons-heading"><BookOpen size={26}/><h1>{t('Bí kíp Cờ vua & Cờ tướng')}</h1></div>
      <p className="lessons-subtitle">{t('Chọn một chương, thử cách đi và xem lời giải ngay trên bàn cờ.')}</p>
      <div className="lesson-games" role="group" aria-label={t('Môn cờ')}>
        {(['chess','xiangqi'] as const).map(game=><button type="button" key={game} aria-pressed={kind===game} onClick={()=>{if(game!==kind)openChapter(game,0);}}><img src={`/thumbs/${game}.jpg`} width="30" height="30" alt=""/>{META[game].name}</button>)}
      </div>
      <div className="lesson-layout">
        <nav className="lesson-chapters" aria-label={t('Các chương {0}', META[kind].name)}>
          <h2>{META[kind].name}</h2>
          {lessons.map((item,index)=><button type="button" key={item.id} aria-current={chapter===index?'step':undefined} onClick={()=>openChapter(kind,index)}><span>{t('Chương') + ' '}{index+1} · {item.theme}</span><strong>{item.title}</strong></button>)}
        </nav>
        <article className="lesson-detail" aria-labelledby="lesson-title">
          <div className="lesson-intro"><span>{lesson.theme}</span><h2 id="lesson-title">{lesson.title}</h2><p>{lesson.summary}</p></div>
          <div className="lesson-workspace">
            <section className="lesson-board" aria-label={t('Ví dụ minh họa')}>
              <FlatBoard key={`${kind}-${lesson.id}`} kind={kind} board={frames[step]} selected={selected}
                targets={hint&&move?[square(move.to)]:[]} last={lastMove} checkSquare={last?.check?square(last.check):null}
                enabled={!done} flipped={false} onSquare={pick}/>
              <div className="lesson-controls">
                <button type="button" className="button button-secondary button-small" disabled={!step} onClick={()=>showStep(step-1)} aria-label={t('Nước trước')}><ArrowLeft size={16}/></button>
                <span>{step}/{lesson.moves.length}{' ' + t('nước')}</span>
                <button type="button" className="button button-secondary button-small" disabled={done} onClick={()=>showStep(step+1)}>{t('Xem nước tiếp') + ' '}<ArrowRight size={16}/></button>
                <button type="button" className="button button-secondary button-small" disabled={!step&&!hint&&selected===null} onClick={()=>showStep(0)} aria-label={t('Về đầu ví dụ')}><RotateCcw size={16}/></button>
              </div>
            </section>
            <section className="lesson-explanation" aria-label={t('Lời giải')}>
              <strong>{done?(lesson.ending==='mate'?t('Chiếu hết'):t('Đã xem hết thế cờ')):step?t('Nước vừa đi'):t('Thử trên bàn cờ')}</strong>
              <p aria-live="polite">{feedback ? t(feedback) : last?.note || lesson.task}</p>
              {move&&<button type="button" className="text-button" aria-pressed={hint} onClick={()=>{setHint(!hint);setFeedback('');}}><Lightbulb size={16}/> {hint?t('Ẩn gợi ý'):t('Gợi ý')}</button>}
              {hint&&move&&<p className="lesson-hint">{t('Chọn') + ' '}{move.from.toUpperCase()}{' ' + t('rồi đến') + ' '}{move.to.toUpperCase()}.</p>}
              <ol className="lesson-moves" aria-label={t('Các nước minh họa')}>
                {lesson.moves.map((item,index)=><li key={`${item.from}-${item.to}`}><button type="button" className={step===index+1?'selected':''} aria-current={step===index+1?'step':undefined} onClick={()=>showStep(index+1)}><span>{index+1}.</span> {kind === 'chess' && getLanguage() === 'en' ? item.label.replace(/^(…?)([MVTX])/u, (_, prefix, piece: string) => prefix + ({M:'N', V:'K', T:'B', X:'R'} as Record<string, string>)[piece]) : item.label}</button></li>)}
              </ol>
              <div className="lesson-tip"><Lightbulb size={18}/><div><strong>{t('Điều cần nhớ')}</strong><p>{lesson.tip}</p></div></div>
            </section>
          </div>
          <div className="lesson-next">
            <a className="button button-secondary" href={`/?game=${kind}`}>{t('Luyện với bot')}</a>
            {chapter+1<lessons.length&&<button type="button" className="button" onClick={()=>openChapter(kind,chapter+1)}>{t('Chương tiếp theo') + ' '}<ArrowRight size={17}/></button>}
          </div>
        </article>
      </div>
      <footer className="lesson-sources">{t('Luật tham khảo') + ' '}<a href="https://handbook.fide.com/chapter/E012023">FIDE</a> · <a href="https://www.wxf-xiangqi.org/images/wxf-rules/2018_World_XiangQi_Rules_English2018.pdf">World Xiangqi Federation</a></footer>
    </main>
  </div>;
}
