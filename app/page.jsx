import Link from 'next/link';
export default function Home(){
 return <main className="welcome-page">
  <div className="wide-hero" role="img" aria-label="Последняя смена — интерактивная викторина по нефтепереработке"/>
  <section className="welcome-actions">
   <div><p className="eyebrow">Три вопроса · 15 участников · один победитель</p><h1>Готовы к смене?</h1><p>Присоединяйтесь к ведущему по QR-коду или введите четырёхзначный код комнаты.</p></div>
   <div className="action-row"><Link href="/play" className="gold-button">Я участник</Link><Link href="/host" className="ghost-button">Я ведущий</Link></div>
  </section>
 </main>;
}
