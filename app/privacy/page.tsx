import Link from "next/link";
import { BrandFooter } from "@/components/brand-footer";
import { HuLaXCredit } from "@/components/hulax-credit";
import "../observatory.css";
export const metadata = {
  title: "Data & Privacy | BCPD One",
  description: "Transparent overview of where BCPD One processes local research data."
};
export default function PrivacyPage(){
 return <div className="hlx-info-shell" id="top"><main className="info-page"><header className="info-nav"><Link href="/">← BCPD ONE / WORKSPACE</Link><span>DATA PRACTICES</span><HuLaXCredit /></header>
  <div className="info-hero"><p className="section-kicker">PRIVACY / LOCAL RESEARCH WORKSPACES</p><h1>Your research settings.<br/><em>Under your control.</em></h1>
    <p>This page describes the current application&apos;s implementation, not a substitute for a legal privacy policy or service agreement.</p></div>
  <div className="info-grid">
    <article className="info-card"><h2>Saved presets</h2><p>Named study configurations are saved in your browser&apos;s localStorage under bcpd-one.presets.v1. They contain selected market identifiers and model settings, not market prices. Clearing site storage deletes the local saved presets.</p></article>
    <article className="info-card"><h2>Uploaded CSV files</h2><p>CSV uploads are read and analyzed in browser memory. The application does not upload the file to its market data API. Refreshing the page clears the temporary imported data.</p></article>
    <article className="info-card"><h2>External market providers</h2><p>When you request market histories, the application server calls whitelisted third-party market providers. Your selected asset identifier and history range are part of the request. External infrastructure may process technical connection data.</p></article>
    <article className="info-card"><h2>Accounts and analytics</h2><p>This MVP does not implement customer authentication, organization accounts, cloud project syncing, or a product analytics SDK. Hosting providers may maintain operational logs. Do not import sensitive files without reviewing your own usage requirements.</p></article>
    <article className="info-card"><h2>Exports and deletion</h2><p>Exports are generated locally when you click the export controls. You choose where to store and share them. Delete saved presets in the workspace or clear the browser&apos;s site data.</p></article>
    <article className="info-card"><h2>Limits</h2><p>Local storage is not encryption or cloud backup. Multi-user security, access control, provider licensing, privacy governance and legal compliance reviews are required before onboarding organizations.</p></article>
  </div><div className="info-banner"><h2>Transparency improves research quality.</h2><p>For the complete source code, see the repository. This experimental product does not offer investment advice.</p><Link href="/">BACK TO RESEARCH →</Link></div>
 </main><BrandFooter studio /></div>;
}
