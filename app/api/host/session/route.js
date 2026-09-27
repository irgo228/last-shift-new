import {isHost} from '../../../../lib/auth.mjs';
import {reply} from '../../../../lib/http.mjs';
export const dynamic='force-dynamic';
export function GET(request){
 try{return reply({ok:true,authenticated:isHost(request)});}catch{return reply({ok:true,authenticated:false,configurationError:true});}
}
