import {reply} from '../../../lib/http.mjs';
export const dynamic='force-dynamic';
export async function GET(){return reply({ok:true,application:'Последняя смена MINI',version:'1.0.0',databaseConfigured:!!process.env.SUPABASE_URL});}
