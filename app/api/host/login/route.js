import {checkHostPassword,issueHostSession,HOST_COOKIE} from '../../../../lib/auth.mjs';
import {reply,fail,parseBody} from '../../../../lib/http.mjs';
import {sameOrigin} from '../../../../lib/guards.mjs';
export async function POST(request){
 try{
  if(!sameOrigin(request))return fail('Недопустимый источник запроса',403);
  const input=await parseBody(request);
  if(!checkHostPassword(input?.password))return fail('Неверный пароль',401);
  const response=reply({ok:true});
  response.cookies.set(HOST_COOKIE,issueHostSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:12*60*60});
  return response;
 }catch(e){if(e.status===400||e.status===413)return fail(e.message,e.status);return fail('Вход временно недоступен. Проверьте настройку сервера.',503);}
}
