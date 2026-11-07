import Link from "next/link";
import { ArrowUpRight, ArrowUp, BookOpen, Github, Layers3, ShieldCheck, Waves, FlaskConical } from "lucide-react";
import { HuLaXCredit } from "./hulax-credit";

type BrandFooterProps = {
  studio?: boolean;
};

/** Brand-family footer; research claims and links stay specific to BCPD One. */
export function BrandFooter({ studio = false }: BrandFooterProps) {
  return (
    <footer className={`hlx-footer${studio ? " hlx-footer-studio" : ""}`} aria-label="BCPD One footer">
      <div className="hlx-footer-panel">
        <div className="hlx-footer-main">
          <div className="hlx-footer-brand">
            <Link href="/" className="hlx-footer-wordmark" aria-label="BCPD One home">
              <span className="hlx-footer-symbol"><Waves size={25} strokeWidth={1.65} aria-hidden="true" /></span>
              <span>BCPD <em>ONE</em><small>THE OBSERVATORY</small></span>
            </Link>
            <p>Explore when the statistical character of a market may have changed. Question the evidence. Keep the assumptions visible.</p>
            <span className="hlx-footer-method-note"><ShieldCheck size={15} aria-hidden="true" /> HISTORICAL RESEARCH · NOT INVESTMENT ADVICE</span>
          </div>

          <nav className="hlx-footer-column" aria-label="Explore BCPD One">
            <h2>EXPLORE</h2>
            <Link href="/"><Layers3 size={15} aria-hidden="true" /> The Observatory</Link>
            <Link href="/research"><BookOpen size={15} aria-hidden="true" /> Research Studio</Link>
            <Link href="/forecast"><FlaskConical size={15} aria-hidden="true" /> Forecast Lab</Link>
            <Link href="/methodology">Our methodology <ArrowUpRight size={13} aria-hidden="true" /></Link>
            <Link href="/privacy">Data practices <ArrowUpRight size={13} aria-hidden="true" /></Link>
          </nav>

          <div className="hlx-footer-column hlx-footer-connect">
            <h2>CONNECT</h2>
            <a href="https://github.com/HuLaxx/BCPD" target="_blank" rel="noopener noreferrer"><Github size={16} aria-hidden="true" /> Project source <ArrowUpRight size={13} aria-hidden="true" /></a>
            <a href="https://github.com/HuLaxx" target="_blank" rel="noopener noreferrer"><Github size={16} aria-hidden="true" /> HuLaX on GitHub <ArrowUpRight size={13} aria-hidden="true" /></a>
            <a href="https://hulax.vercel.app" target="_blank" rel="noopener noreferrer">Creator portfolio <ArrowUpRight size={13} aria-hidden="true" /></a>
          </div>
        </div>

        <div className="hlx-footer-bottom">
          <span>© {new Date().getFullYear()} BCPD ONE <i /> RESEARCH INSTRUMENTS</span>
          <a className="hlx-footer-back-top" href="#top">BACK TO TOP <ArrowUp size={14} aria-hidden="true" /></a>
          <HuLaXCredit placement="footer" />
        </div>
      </div>
    </footer>
  );
}
