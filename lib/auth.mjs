import crypto from 'node:crypto';
const COOKIE='last_shift_host';
export const HOST_COOKIE=COOKIE;
function secret(){const s=process.env.HOST_SESSION_SECRET;if(!s||s.length<32)throw new Error('HOST_SESSION_SECRET must be at least 32 characters');return s;}
function digest(v){return crypto.createHash('sha256').update(v).digest();}
export function checkHostPassword(input){
  const s=process.env.HOST_ACCESS_PASSWORD;
  if(!s||s.length<12)throw new Error('HOST_ACCESS_PASSWORD must be at least 12 characters');
  return crypto.timingSafeEqual(digest(String(input)),digest(s));
}
export function issueHostSession(now=Date.now()){
  const payload=Buffer.from(JSON.stringify({role:'host',exp:now+12*60*60*1000})).toString('base64url');
  const signature=crypto.createHmac('sha256',secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
export function validHostSession(token,now=Date.now()){
  if(typeof token!=='string'||token.length>1000)return false;
  const bits=token.split('.');if(bits.length!==2)return false;
  const expected=crypto.createHmac('sha256',secret()).update(bits[0]).digest();
  let provided;try{provided=Buffer.from(bits[1],'base64url');}catch{return false;}
  if(provided.length!==expected.length||!crypto.timingSafeEqual(provided,expected))return false;
  try{const p=JSON.parse(Buffer.from(bits[0],'base64url').toString());return p.role==='host'&&Number.isFinite(p.exp)&&p.exp>now;}catch{return false;}
}
export function isHost(request){return validHostSession(request.cookies.get(COOKIE)?.value);}
export function hashToken(token){return crypto.createHash('sha256').update(token).digest('hex');}
export function newToken(){return crypto.randomBytes(32).toString('hex');}
export function bearerToken(request){const x=request.headers.get('authorization')||'';const m=/^Bearer ([0-9a-f]{64})$/.exec(x);return m?.[1]||null;}
