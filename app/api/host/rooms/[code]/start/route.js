import {reply,fail} from '../../../../../../lib/http.mjs';
import {requireHost,checkRoomCode,sameOrigin} from '../../../../../../lib/guards.mjs';
import {startRoom,explainDbError} from '../../../../../../lib/server.mjs';
export async function POST(request,{params}){
 const {code}=await params;
 try{
  const denied=requireHost(request)||checkRoomCode(code);if(denied)return denied;
  if(!sameOrigin(request))return fail('Недопустимый источник запроса',403);
  const startedAt=await startRoom(code);return reply({ok:true,startedAt});
 }catch(e){const [message,status]=explainDbError(e);return fail(message,status);}
}
