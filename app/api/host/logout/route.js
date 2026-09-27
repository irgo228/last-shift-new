import {HOST_COOKIE} from '../../../../lib/auth.mjs';
import {reply} from '../../../../lib/http.mjs';
import {sameOrigin} from '../../../../lib/guards.mjs';
export async function POST(request){
 if(!sameOrigin(request))return reply({ok:false},403);
 const response=reply({ok:true});response.cookies.set(HOST_COOKIE,'',{httpOnly:true,sameSite:'strict',path:'/',maxAge:0});return response;
}
