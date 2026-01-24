import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'BCPD Project',
  description: 'Best-in-class build overview for the BCPD platform.'
};

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/architecture', label: 'Architecture' },
  { href: '/tech-stack', label: 'Tech Stack' },
  { href: '/data', label: 'Data' },
  { href: '/demo', label: 'Demo' },
  { href: '/assessment', label: 'Rubric' }
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="page">
          <header className="site-header">
            <div className="logo-block">
              <span className="logo-mark">BCPD</span>
              <div>
                <p className="eyebrow">Capsule Build</p>
                <h1>BCPD Modernization</h1>
              </div>
            </div>
            <nav className="capsule-nav">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="capsule-link">
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="content">{children}</main>
          <footer className="site-footer">
            <p>Built for clarity, resilience, and mission-ready delivery.</p>
            <div className="footer-links">
              <span>Release: 2024.09</span>
              <span>Contact: delivery@bcpd.example</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
