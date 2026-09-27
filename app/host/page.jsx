'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import ZoomableDiagram from '../components/ZoomableDiagram';
import {leaderboardSlots} from '../../lib/leaderboard-slots.mjs';

const STORAGE_KEY='lastshift-mini-host-room';
async function jsonFetch(url,options){const r=await fetch(url,{cache:'no-store',...options});const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(data.error||'Не удалось связаться с сервером'),{status:r.status});return data;}
function Countdown({phase,serverNow}){
 const [remain,setRemain]=useState(null);
 useEffect(()=>{if(!phase?.endsAt){setRemain(null);return;}
  const offset=Date.parse(serverNow)-Date.now();
  const update=()=>setRemain(Math.max(0,Math.ceil((Date.parse(phase.endsAt)-Date.now()-offset)/1000)));
  update();const id=setInterval(update,200);return()=>clearInterval(id);
 },[phase?.endsAt,serverNow]);
 if(remain==null)return null;
 return <span className={'timer '+(remain<=5?'urgent':'')}>{remain} с</span>;
}
function Stage({state}){
 const {phase,question,serverNow}=state;
 if(phase.kind==='question')return <section className="stage" aria-live="polite">
  <div className="stage-heading"><span className="stage-label">ВОПРОС {phase.questionNo} / 3</span><Countdown phase={phase} serverNow={serverNow}/></div>
  <h2>{question.text}</h2><ZoomableDiagram src={question.image} alt={'Технологическая схема к вопросу '+phase.questionNo}/>
  <div className="host-options">{question.choices.map(c=><div key={c.id}><b>{c.id}</b> {c.text}</div>)}</div>
  <p className="stage-progress">Ответили: {state.submittedCount} из {state.room.participantCount}</p>
 </section>;
 if(phase.kind==='reveal')return <section className="stage" aria-live="polite"><div className="stage-heading"><span className="stage-label">РАЗБОР ВОПРОСА {phase.questionNo}</span><Countdown phase={phase} serverNow={serverNow}/></div><ZoomableDiagram src={question.answerImage} alt={'Изображение с правильным ответом на вопрос '+phase.questionNo}/><div className="answer-label">Правильный ответ: {question.correct}</div></section>;
 const winner=state.winner;
 const ranking=state.leaderboard||[];
 const slots=leaderboardSlots(ranking);
 if(phase.kind==='final')return <><section className="victory" aria-label="Результаты викторины" aria-live="polite">
  <div className="victory-winner"><div className="winner-name" data-length={winner?.name?.length>24?'long':winner?.name?.length>16?'medium':'short'}>{winner?.name||'Нет участников'}</div></div>
  <div className="victory-score">{winner?`${winner.score} / 3`:''}</div>
  <ol className="victory-ranking" aria-label="Десять лучших участников">{slots.map((player,i)=><li key={player?.id||'empty-'+i} className={player?'rank-'+(i+1):'rank-empty'} aria-label={player?`${i+1} место: ${player.name}, ${player.score} баллов`:undefined} aria-hidden={!player}>
    {player&&<><span className="ranking-name" title={player.name}>{player.name}</span><span className="ranking-score">{player.score}</span></>}
  </li>)}</ol>
 </section>
  <div className="victory-mobile-summary"><h2>Победитель</h2><p className="mobile-winner">{winner?.name||'Нет участников'} — {winner?.score??0} / 3</p>
  <h2>ТОП-10</h2><ol>{ranking.slice(0,10).map(p=><li key={'mobile-'+p.id}><div className="mobile-rank-row"><span>{p.name}</span><span>{p.score} / 3</span></div></li>)}</ol></div>
 </>;
 return null;
}
export default function HostPage(){
 const [authorized,setAuthorized]=useState(null),[password,setPassword]=useState(''),[code,setCode]=useState(null),[room,setRoom]=useState(null),[qr,setQr]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[online,setOnline]=useState(true);
 const pollRef=useRef(false);
 useEffect(()=>{let alive=true;jsonFetch('/api/host/session').then(d=>{if(alive)setAuthorized(d.authenticated);}).catch(()=>{if(alive)setAuthorized(false);});try{const prev=sessionStorage.getItem(STORAGE_KEY);if(prev&&/^\d{4}$/.test(prev))setCode(prev);}catch{}return()=>{alive=false};},[]);
 const refresh=useCallback(async()=>{
  if(!code||pollRef.current)return;pollRef.current=true;
  try{const d=await jsonFetch('/api/host/rooms/'+code+'/state');setRoom(d);setOnline(true);setError('');}
  catch(e){if(e.status===401)setAuthorized(false);else if(e.status===404){setCode(null);setRoom(null);try{sessionStorage.removeItem(STORAGE_KEY)}catch{}}else setOnline(false);setError(e.message);}finally{pollRef.current=false;}
 },[code]);
 useEffect(()=>{if(!authorized||!code)return;refresh();const id=setInterval(refresh,2500);const onFocus=()=>{if(!document.hidden)refresh()};window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onFocus);return()=>{clearInterval(id);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus);};},[code,authorized,refresh]);
 useEffect(()=>{if(!authorized||!code||!room?.phase?.endsAt)return;const offset=Date.parse(room.serverNow)-Date.now();const ms=Date.parse(room.phase.endsAt)-Date.now()-offset+200;const id=setTimeout(refresh,Math.max(200,ms));return()=>clearTimeout(id);},[authorized,code,room?.phase?.endsAt,room?.serverNow,refresh]);
 useEffect(()=>{if(!code)return;let alive=true;let url=window.location.origin+'/play/'+code;const setup=async()=>{const qrLib=await import('qrcode');const data=await qrLib.default.toDataURL(url,{width:512,margin:1,errorCorrectionLevel:'M',color:{dark:'#151515',light:'#ffffffff'}});if(alive)setQr(data);};setup().catch(()=>setError('Не удалось сформировать QR-код'));return()=>{alive=false};},[code]);
 async function login(e){e.preventDefault();setBusy(true);setError('');try{await jsonFetch('/api/host/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});setAuthorized(true);setPassword('');}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function create(){setBusy(true);setError('');try{const d=await jsonFetch('/api/host/rooms',{method:'POST'});setCode(d.room.code);setRoom(null);sessionStorage.setItem(STORAGE_KEY,d.room.code);}catch(e){setError(e.message);if(e.status===401)setAuthorized(false);}finally{setBusy(false);}}
 async function start(){setBusy(true);setError('');try{await jsonFetch('/api/host/rooms/'+code+'/start',{method:'POST'});await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(authorized===null)return <main className="center-panel"><p>Открываем панель ведущего…</p></main>;
 if(!authorized)return <main className="host-login"><div className="login-card"><p className="eyebrow">ПОСЛЕДНЯЯ СМЕНА</p><h1>Вход ведущего</h1><p>Укажите пароль, заданный при развёртывании сайта.</p><form onSubmit={login}><label htmlFor="password">Пароль</label><input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={12} required autoComplete="current-password"/><button className="gold-button" disabled={busy}>{busy?'Проверяем…':'Войти'}</button></form>{error&&<p role="alert" className="error">{error}</p>}<Link href="/" className="muted-link">Вернуться на главную</Link></div></main>;
 if(!code)return <main className="welcome-page"><div className="wide-hero"/><section className="welcome-actions"><div><p className="eyebrow">ПАНЕЛЬ ВЕДУЩЕГО</p><h1>Новая викторина</h1><p>Создайте комнату — появится QR-код для 15 участников.</p></div><button className="gold-button" onClick={create} disabled={busy}>{busy?'Создаём…':'Создать комнату'}</button>{error&&<p role="alert" className="error">{error}</p>}</section></main>;
 const phase=room?.phase?.kind||'lobby';
 return <main className="host-room">
  <div className="host-toolbar"><Link href="/" className="brand-mini">ПОСЛЕДНЯЯ <b>СМЕНА</b></Link><span className="room-pill">Комната {code}</span><span className={'connection-status '+(online?'good':'bad')}>{online?'● На связи':'● Восстанавливаем связь…'}</span></div>
  {phase==='lobby' ? <><div className="lobby-board" aria-label="Последняя смена — вход в комнату">
    <div className="lobby-qr">{qr?<img src={qr} alt={'QR-код для входа в комнату '+code}/>:<span>Создаём QR…</span>}<span className="lobby-code">{code}</span></div>
    <button className="lobby-start" onClick={start} disabled={busy||!room?.room?.participantCount}>{busy?'Запускаем…':'Начать игру'}</button>
  </div><div className="lobby-mobile-controls">
    {qr?<img src={qr} alt={'QR-код для входа в комнату '+code}/>:<span>Создаём QR…</span>}
    <span className="lobby-code">{code}</span>
    <button className="gold-button" onClick={start} disabled={busy||!room?.room?.participantCount}>{busy?'Запускаем…':'Начать игру'}</button>
  </div><div className="participants"><div><h2>Участники: {room?.room?.participantCount??'…'}/15</h2><p>Покажите QR-код на большом экране. Игроки появятся здесь после входа.</p></div><div className="name-chips">{(room?.participants||[]).map(p=><span key={p.id}>{p.display_name}</span>)}</div></div></> : <Stage state={room}/>}
  {error&&<div className="small-error" role="alert">{error}</div>}
  {phase==='final'&&<div className="below-stage"><p>Результаты сохранены в Supabase. Для следующей группы создайте новую комнату.</p><button className="ghost-button" onClick={()=>{setCode(null);setRoom(null);sessionStorage.removeItem(STORAGE_KEY)}}>Новая комната</button></div>}
 </main>;
}
