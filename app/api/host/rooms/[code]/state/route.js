import {reply,fail} from '../../../../../../lib/http.mjs';
import {requireHost,checkRoomCode} from '../../../../../../lib/guards.mjs';
import {buildRoomState,explainDbError} from '../../../../../../lib/server.mjs';
export const dynamic='force-dynamic';
export async function GET(request,{params}){
 const {code}=await params;
 try{
  const denied=requireHost(request)||checkRoomCode(code);if(denied)return denied;
  const state=await buildRoomState(code,{host:true});return state?reply(state):fail('Комната не найдена',404);
 }catch(e){const [message,status]=explainDbError(e);return fail(message,status);}
}
