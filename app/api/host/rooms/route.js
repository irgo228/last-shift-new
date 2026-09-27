import {reply,fail} from '../../../../lib/http.mjs';
import {createRoom} from '../../../../lib/server.mjs';
import {requireHost,sameOrigin} from '../../../../lib/guards.mjs';
export async function POST(request){
 try{
  const denied=requireHost(request);if(denied)return denied;
  if(!sameOrigin(request))return fail('Недопустимый источник запроса',403);
  const room=await createRoom();
  return reply({ok:true,room:{code:room.code,id:room.id}});
 }catch{return fail('Не удалось создать комнату. Проверьте Supabase.',503);}
}
