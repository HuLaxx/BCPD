import Link from "next/link";
import { BrandFooter } from "@/components/brand-footer";
import { HuLaXCredit } from "@/components/hulax-credit";
import "../observatory.css";
export const metadata = {
  title: "Methodology | BCPD One",
  description: "Methodology, provenance, assumptions and reproducibility for the BCPD One research platform."
};
const sections=[
  ["01 / Data provenance","Price observations originate from the whitelisted Yahoo Finance chart endpoint (unofficial), or from CoinGecko Demo where configured and permitted. Users may choose their own date,close CSV. Provider failures are displayed instead of replaced with invented data."],
  ["02 / Calendar alignment","Observed daily closes are grouped by common UTC Sunday–Saturday periods. The final actual close of each week is used; non-trading equity days are never forward-filled. Returns are 100 × ln(close(t) / close(t−1))."],
  ["03 / Bayesian detection","A Gaussian mean-shift Bayesian online change-point recursion models posterior run lengths using a constant hazard. Its output is a model-conditional posterior reset probability, not the probability of a verified market event."],
  ["04 / Parameter stability","Nine variations explore three hazard settings and three fixed observation-variance scales. Agreement of nearby posterior peaks quantifies sensitivity to these parameters. Agreement is not calibrated certainty or independently verified predictive accuracy."],
  ["05 / Market comparisons","Pairwise Pearson correlations use only common observed weekly periods and require at least twelve overlaps. Annualized volatility is sample weekly return standard deviation multiplied by √52. Shared shift windows show temporal proximity, not causation."],
  ["06 / Honest limitations","The model estimates observation variance from the full return sample and a prior mean from initial observations. This introduces hindsight and does not constitute a leakage-free online forecast. Alternative models, academic source snapshots and walk-forward benchmarks are required before scientific validation."]
];
export default function MethodologyPage(){
 return <div className="hlx-info-shell" id="top"><main className="info-page"><header className="info-nav"><Link href="/">← BCPD ONE / WORKSPACE</Link><span>SCIENTIFIC METHODS</span><HuLaXCredit /></header>
  <div className="info-hero"><p className="section-kicker">RESEARCH TRANSPARENCY / V1</p><h1>What the model measures.<br/><em>And what it doesn’t.</em></h1>
  <p>Every chart should have a traceable observation, a documented model assumption and an honest limit on interpretation.</p></div>
  <div className="info-grid">{sections.map(([title,desc])=><article className="info-card" key={title}><h2>{title}</h2><p>{desc}</p></article>)}</div>
  <section className="info-banner"><h2>Reproducibility is an operating principle.</h2><p>Export a source-attributed CSV or a research JSON report from the workspace. A report includes model parameters, candidate peaks, observation dates, weekly returns, source labels and retrieval times. Reported source labels do not grant redistribution rights.</p>
    <Link href="/">OPEN RESEARCH WORKSPACE →</Link></section>
 </main><BrandFooter studio /></div>;
}
