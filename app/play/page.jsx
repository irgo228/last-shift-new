'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
export default function EnterCode(){
 const [code,setCode]=useState('');const router=useRouter();
 return <main className="entry-page"><div className="entry-card"><p className="eyebrow">ПОСЛЕДНЯЯ СМЕНА</p><h1>Войти в викторину</h1><p>Введите четырёхзначный код с экрана ведущего.</p><form onSubmit={e=>{e.preventDefault();if(/^\d{4}$/.test(code))router.push('/play/'+code);}}><label htmlFor="code">Код комнаты</label><input id="code" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" placeholder="0000" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,4))} required/><button className="gold-button">Продолжить</button></form><Link href="/" className="muted-link">Назад</Link></div></main>;
}
