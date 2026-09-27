'use client';
import {useParams} from 'next/navigation';
import {useEffect,useRef,useState,useCallback} from 'react';
import Link from 'next/link';
import ZoomableDiagram from '../../components/ZoomableDiagram';
const OPTIONS=['А','Б','В','Г'];
async function call(url,token,options={}){const res=await fetch(url,{cache:'no-store',...options,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(options.headers||{})}});const json=await res.json().catch(()=>({}));if(!res.ok)throw Object.assign(new Error(json.error||'Ошибка соединения'),{status:res.status});return json;}
function Timer({phase,serverNow}){
 const [left,setLeft]=useState(null);
 useEffect(()=>{if(!phase?.endsAt){setLeft(null);return;}
  const offset=Date.parse(serverNow)-Date.now();const tick=()=>setLeft(Math.max(0,Math.ceil((Date.parse(phase.endsAt)-Date.now()-offset)/1000)));tick();let id=setInterval(tick,180);return()=>clearInterval(id);
 },[phase?.endsAt,serverNow]);
 if(left===null)return null;return <span className={'timer '+(left<=5?'urgent':'')}>{left} с</span>;
}
export default function PlayerPage(){
 const {code}=useParams();const valid=typeof code==='string'&&/^\d{4}$/.test(code);
 const [token,setToken]=useState(null),[name,setName]=useState(''),[state,setState]=useState(null),[waiting,setWaiting]=useState(true),[joining,setJoining]=useState(false),[sending,setSending]=useState(false),[error,setError]=useState(''),[online,setOnline]=useState(true);
 const stateRef=useRef(null),busyRef=useRef(false),acceptedRef=useRef(null);
 useEffect(()=>{if(!valid)return;try{const old=localStorage.getItem('ls-mini:'+code);if(old&&/^[0-9a-f]{64}$/.test(old))setToken(old);}catch{}setWaiting(false);},[code,valid]);
 const refresh=useCallback(async()=>{
  if(!valid||!token||busyRef.current)return;busyRef.current=true;
  try{
   const data=await call('/api/rooms/'+code+'/state',token);
   // A delayed read cannot visually clear an already acknowledged answer for the same question.
   if(acceptedRef.current&&data.phase.questionNo===acceptedRef.current.questionNo&&data.phase.kind==='question'&&!data.me.answer)data.me.answer=acceptedRef.current.answer;
   if(acceptedRef.current&&data.phase.questionNo!==acceptedRef.current.questionNo)acceptedRef.current=null;
   stateRef.current=data;setState(data);setError('');setOnline(true);
  }catch(e){if(e.status===401){setToken(null);try{localStorage.removeItem('ls-mini:'+code)}catch{}}else setOnline(false);setError(e.message);}finally{busyRef.current=false;}
 },[code,token,valid]);
 useEffect(()=>{if(!token)return;refresh();const id=setInterval(refresh,2500);const focus=()=>{if(!document.hidden)refresh()};window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);return()=>{clearInterval(id);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};},[token,refresh]);
 useEffect(()=>{if(!token||!state?.phase?.endsAt)return;const offset=Date.parse(state.serverNow)-Date.now();const ms=Date.parse(state.phase.endsAt)-Date.now()-offset+200;const id=setTimeout(refresh,Math.max(200,ms));return()=>clearTimeout(id);},[token,state?.phase?.endsAt,state?.serverNow,refresh]);
 useEffect(()=>{if(!token)return;const imgs=['q1-question.png','q2-question.png','q3-question.png'];imgs.forEach(n=>{const image=new Image();image.src='/assets/'+n;});},[token]);
 async function join(e){e.preventDefault();setJoining(true);setError('');try{const data=await call('/api/rooms/'+code+'/join',null,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});localStorage.setItem('ls-mini:'+code,data.token);setToken(data.token);setName(data.name);}catch(e){setError(e.message);}finally{setJoining(false);}}
 async function answer(option){const curr=stateRef.current||state;if(!curr||sending||curr.phase.kind!=='question'||curr.me?.answer)return;
  const questionNo=curr.phase.questionNo;setSending(true);setError('');
  try{const res=await call('/api/rooms/'+code+'/answer',token,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({questionNo,option})});
   acceptedRef.current={questionNo,answer:res.answer};setState(old=>old?.phase?.questionNo===questionNo?({...old,me:{...old.me,answer:res.answer}}):old);
  }catch(e){setError(e.message);await refresh();}finally{setSending(false);}
 }
 if(!valid)return <main className="entry-page"><div className="entry-card"><h1>Неправильный код комнаты</h1><Link className="gold-button" href="/play">Ввести другой код</Link></div></main>;
 if(waiting)return <main className="center-panel">Проверяем сохранённое подключение…</main>;
 if(!token)return <main className="entry-page"><div className="entry-card"><p className="eyebrow">КОМНАТА {code}</p><h1>Как вас зовут?</h1><p>Ваше имя появится на итоговом экране. Максимум 15 участников.</p><form onSubmit={join}><label htmlFor="player-name">Имя участника</label><input id="player-name" maxLength={32} minLength={2} required autoComplete="name" placeholder="Имя и фамилия" value={name} onChange={e=>setName(e.target.value)}/><button className="gold-button" disabled={joining}>{joining?'Подключаемся…':'Присоединиться'}</button></form>{error&&<p className="error" role="alert">{error}</p>}<Link href="/play" className="muted-link">Изменить код комнаты</Link></div></main>;
 if(!state)return <main className="entry-page"><div className="entry-card"><h2>Подключаемся к игре…</h2><p>Комната {code}. {online?'Ожидаем данные сервера.':'Восстанавливаем связь…'}</p><button onClick={refresh} className="ghost-button">Обновить статус</button>{error&&<p className="error">{error}</p>}</div></main>;
 const {phase,question,me,serverNow}=state;const answered=!!me?.answer;
 return <main className="player-app"><header className="player-header"><span className="brand-mini">ПОСЛЕДНЯЯ <b>СМЕНА</b></span><span className="room-pill">{code}</span></header>
  {!online&&<div className="connection-alert" role="status">Восстанавливаем связь. Принятые ответы сохранены на сервере.</div>}
  {phase.kind==='lobby'&&<section className="player-card waiting-card"><p className="eyebrow">ВЫ В ИГРЕ</p><h1>{me?.name||name}</h1><p>Ожидайте, когда ведущий начнёт викторину.</p><p className="player-counter">Участников: {state.room.participantCount}/15</p><img src="/assets/title.jpg" alt="Последняя смена" className="lobby-preview"/></section>}
  {phase.kind==='question'&&<section className="player-card"><div className="stage-heading"><span className="stage-label">ВОПРОС {phase.questionNo} / 3</span><Timer phase={phase} serverNow={serverNow}/></div><h1>{question.text}</h1><ZoomableDiagram src={question.image} alt="Технологическая схема" mode="player"/><div className="answer-options">{question.choices.map((choice,i)=><button key={choice.id} type="button" className={'option '+(me?.answer===choice.id?'selected':'')} disabled={answered||sending} onClick={()=>answer(choice.id)}><span className="option-id">{OPTIONS[i]}</span><span>{choice.text}</span></button>)}</div>{answered&&<p className="accepted" role="status">✓ Ваш ответ {me.answer} принят. Ждём остальных участников.</p>}{sending&&<p role="status">Отправляем ответ…</p>}</section>}
  {phase.kind==='reveal'&&<section className="player-card"><div className="stage-heading"><span className="stage-label">ПРАВИЛЬНЫЙ ОТВЕТ {phase.questionNo} / 3</span><Timer phase={phase} serverNow={serverNow}/></div><ZoomableDiagram src={question.answerImage} alt="Объяснение правильного ответа" mode="player"/><h2>Правильный вариант: {question.correct}</h2></section>}
  {phase.kind==='final'&&<section className="player-card final-player"><p className="eyebrow">ИГРА ОКОНЧЕНА</p><h1>{me.name}, спасибо за участие!</h1><p>Ваш результат:</p><strong className="final-number">{state.myResult?.score??0} / 3</strong><p className="your-rank">Место: {state.myResult?.rank||'—'}</p><h2>Победитель — {state.winner?.name||'—'}</h2></section>}
  {error&&<p className="error" role="alert">{error}</p>}

 </main>;
}
