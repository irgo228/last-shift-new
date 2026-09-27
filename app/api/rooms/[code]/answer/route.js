import {reply,fail,parseBody} from '../../../../../lib/http.mjs';
import {checkRoomCode,requirePlayer,sameOrigin} from '../../../../../lib/guards.mjs';
import {submitAnswer,explainDbError} from '../../../../../lib/server.mjs';
export async function POST(request,{params}){
 const {code}=await params;
 try{
  const denied=checkRoomCode(code);if(denied)return denied;
  if(!sameOrigin(request))return fail('Недопустимый источник запроса',403);
  const auth=requirePlayer(request);if(auth.error)return auth.error;
  const body=await parseBody(request);
  if(!Number.isInteger(body?.questionNo)||body.questionNo<1||body.questionNo>3||!['А','Б','В','Г'].includes(body?.option))return fail('Некорректный ответ',400);
  const result=await submitAnswer(code,auth.token,body.questionNo,body.option);
  return reply({ok:true,...result});
 }catch(e){if(e.status===400||e.status===413)return fail(e.message,e.status);const [message,status]=explainDbError(e);return fail(message,status);}
}
