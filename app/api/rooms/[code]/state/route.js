import {reply,fail} from '../../../../../lib/http.mjs';
import {checkRoomCode,requirePlayer} from '../../../../../lib/guards.mjs';
import {buildRoomState,explainDbError} from '../../../../../lib/server.mjs';
export const dynamic='force-dynamic';
export async function GET(request,{params}){
 const {code}=await params;
 try{
  const denied=checkRoomCode(code);if(denied)return denied;
  const auth=requirePlayer(request);if(auth.error)return auth.error;
  const state=await buildRoomState(code,{token:auth.token});
  if(!state)return fail('Комната не найдена',404);
  if(state.denied)return fail('Участник не найден, войдите заново',401);
  return reply(state);
 }catch(e){const [message,status]=explainDbError(e);return fail(message,status);}
}
