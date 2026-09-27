import './globals.css';
export const metadata = {
  title: 'Последняя смена — викторина по нефтепереработке',
  description: 'Три вопроса о работе ректификационной установки. Подключение по QR-коду.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }) {
  return <html lang="ru"><body>{children}</body></html>;
}
