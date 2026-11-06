import Link from "next/link";
export default function NotFound(){
 return <main className="info-page"><div className="info-hero"><p className="section-kicker">404 / NO SUCH PAGE</p><h1>The signal isn’t here.</h1><p>Return to the BCPD One research workspace.</p><Link className="info-back" href="/">BACK TO WORKSPACE →</Link></div></main>;
}
