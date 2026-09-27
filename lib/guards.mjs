import {isHost,bearerToken} from './auth.mjs';
import {fail,validateCode} from './http.mjs';
export function checkRoomCode(code){return validateCode(code)?null:fail('Код комнаты должен содержать ровно 4 цифры',400);}
export function requireHost(request){return isHost(request)?null:fail('Требуется вход ведущего',401);}
export function requirePlayer(request){const token=bearerToken(request);return token?{token}:{error:fail('Необходим повторный вход в комнату',401)};}
export function sameOrigin(request){
 const origin=request.headers.get('origin');
 if(!origin)return true;
 try{const source=new URL(origin).host;const external=request.headers.get('x-forwarded-host')||request.headers.get('host')||new URL(request.url).host;return source===external;}catch{return false;}
}
