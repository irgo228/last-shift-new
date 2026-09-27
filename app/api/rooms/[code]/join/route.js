import {reply,fail,parseBody} from '../../../../../lib/http.mjs';
import {checkRoomCode,sameOrigin} from '../../../../../lib/guards.mjs';
import {joinRoom,normalizeName,explainDbError} from '../../../../../lib/server.mjs';
export async function POST(request,{params}){
 const {code}=await params;
 try{
  const denied=checkRoomCode(code);if(denied)return denied;
  if(!sameOrigin(request))return fail('Недопустимый источник запроса',403);
  const body=await parseBody(request);const name=normalizeName(body?.name);
  if(!name)return fail('Введите имя: от 2 до 32 символов',400);
  const result=await joinRoom(code,name);return reply({ok:true,...result,name});
 }catch(e){if(e.status===400||e.status===413)return fail(e.message,e.status);const [message,status]=explainDbError(e);return fail(message,status);}
}
