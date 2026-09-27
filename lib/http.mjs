import { NextResponse } from 'next/server';
export function reply(data,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'}});}
export function fail(message,status=400){return reply({ok:false,error:message},status);}
export async function parseBody(request){
  if(Number(request.headers.get('content-length')||0)>4096)throw Object.assign(new Error('Слишком большой запрос'),{status:413});
  const content=await request.text();if(content.length>4096)throw Object.assign(new Error('Слишком большой запрос'),{status:413});
  try{return JSON.parse(content);}catch{throw Object.assign(new Error('Некорректный JSON'),{status:400});}
}
export function validateCode(x){return typeof x==='string'&&/^\d{4}$/.test(x);}
export const dynamic='force-dynamic';
