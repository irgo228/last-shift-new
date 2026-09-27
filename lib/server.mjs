import crypto from 'node:crypto';
import { db } from './supabase.mjs';
import { hashToken, newToken } from './auth.mjs';
import { QUESTIONS,publicQuestion } from './questions.mjs';
import {phaseForRoom,calculateLeaderboard} from './game.mjs';

export function explainDbError(e){
 const msg=String(e?.message||'Неизвестная ошибка базы данных');
 const map={ROOM_NOT_FOUND:['Комната не найдена',404],ROOM_ALREADY_STARTED:['Игра уже началась',409],ROOM_FULL:['В комнате уже 15 участников',409],NAME_TAKEN:['Это имя уже занято. Добавьте фамилию или букву.',409],NO_PLAYERS:['Для старта нужен хотя бы один игрок',409],NOT_A_PLAYER:['Участник не найден',401],QUESTION_CLOSED:['Время ответа истекло',409],GAME_NOT_STARTED:['Игра ещё не началась',409],INVALID_OPTION:['Некорректный вариант',400]};
 for(const [k,v] of Object.entries(map))if(msg.includes(k))return v;
 if(e?.code==='23505')return ['Это имя или код уже заняты',409];
 return ['Сервер базы данных временно недоступен',503];
}
export function normalizeName(input){
 if(typeof input!=='string')return null;
 const s=input.trim().replace(/\s+/g,' ');
 if([...s].length<2||[...s].length>32||/[\u0000-\u001f\u007f<>]/u.test(s))return null;
 return s;
}
export async function createRoom(){
 const client=db();
 // Room codes are exactly four digits, including leading zeroes.
 for(let attempt=0;attempt<50;attempt++){
  const code=String(crypto.randomInt(0,10000)).padStart(4,'0');
  const {data,error}=await client.from('ls_mini_rooms').insert({code}).select('id,code,created_at').single();
  if(!error)return data;
  if(error.code!=='23505')throw error;
 }
 throw new Error('No free four-digit room codes');
}
export async function findRoom(code){
 const {data,error}=await db().from('ls_mini_rooms').select('id,code,created_at,started_at').eq('code',code).maybeSingle();
 if(error)throw error;
 if(!data||Date.now()-Date.parse(data.created_at)>24*60*60*1000)return null;
 return data;
}
export async function joinRoom(code,name){
 const token=newToken();
 const {data,error}=await db().rpc('ls_mini_join_room',{p_code:code,p_name:name,p_token_hash:hashToken(token)});
 if(error)throw error;
 return {id:data,token};
}
export async function startRoom(code){
 const {data,error}=await db().rpc('ls_mini_start_room',{p_code:code});
 if(error)throw error;
 return data;
}
export async function submitAnswer(code,token,questionNo,option){
 const {data,error}=await db().rpc('ls_mini_submit_answer',{
  p_code:code,p_token_hash:hashToken(token),p_question_no:questionNo,p_option_label:option,
 });
 if(error)throw error;
 return data;
}
export async function buildRoomState(code,{host=false,token=null}={}){
 const room=await findRoom(code);
 if(!room)return null;
 const nowMs=Date.now();
 const phase=phaseForRoom(room.started_at?'started':'lobby',room.started_at,nowMs);
 const client=db();
 let player=null,players=[],answers=[];
 if(host||phase.kind==='final'){
  const res=await client.from('ls_mini_players').select('id,display_name,joined_at').eq('room_id',room.id).order('joined_at',{ascending:true});
  if(res.error)throw res.error;
  players=res.data||[];
 }else{
  // Retain an accurate lobby headcount without transmitting other players' private data.
  const count=await client.from('ls_mini_players').select('id',{count:'exact',head:true}).eq('room_id',room.id);
  if(count.error)throw count.error;
  room.playerCount=count.count||0;
 }
 if(!host){
  if(!token)return {denied:true};
  const p=await client.from('ls_mini_players').select('id,display_name,joined_at').eq('room_id',room.id).eq('token_hash',hashToken(token)).maybeSingle();
  if(p.error)throw p.error;
  if(!p.data)return {denied:true};
  player=p.data;
 }
 let submittedCount=0,playerAnswer=null;
 if(phase.kind==='question'||phase.kind==='reveal'){
  if(host){
   const count=await client.from('ls_mini_answers').select('id',{head:true,count:'exact'}).eq('room_id',room.id).eq('question_no',phase.questionNo);
   if(count.error)throw count.error;
   submittedCount=count.count||0;
  }else{
   const a=await client.from('ls_mini_answers').select('option_label,elapsed_ms').eq('player_id',player.id).eq('question_no',phase.questionNo).maybeSingle();
   if(a.error)throw a.error;
   playerAnswer=a.data||null;
  }
 }
 let leaderboard=null;
 if(phase.kind==='final'){
  const a=await client.from('ls_mini_answers').select('player_id,question_no,option_label,elapsed_ms').eq('room_id',room.id);
  if(a.error)throw a.error;
  answers=a.data||[];
  leaderboard=calculateLeaderboard(players,answers,QUESTIONS.map(q=>q.correct));
 }
 const state={ok:true,serverNow:new Date(nowMs).toISOString(),room:{code:room.code,started:!!room.started_at,startedAt:room.started_at,participantCount:players.length||room.playerCount||0},phase,question:phase.kind==='question'||phase.kind==='reveal'?publicQuestion(phase.questionNo-1,phase.kind==='reveal'):null};
 if(host){state.participants=players;state.submittedCount=submittedCount;}
 else {state.me={id:player.id,name:player.display_name,answer:playerAnswer?.option_label||null};}
 if(leaderboard){
  state.leaderboard=host?leaderboard.slice(0,10):null;
  state.winner=leaderboard[0]||null;
  if(!host)state.myResult=leaderboard.find(p=>p.id===player.id)||null;
 }
 return state;
}
