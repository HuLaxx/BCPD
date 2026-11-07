import Link from "next/link";
import { ResearchWorkbench } from "@/components/research-workbench";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research Studio | BCPD One",
  description: "Configure, test, compare, import and export research-grade Bayesian change-point studies.",
};

export default function ResearchStudio() {
  return <>
    <div style={{background:"#08131e",borderBottom:"1px solid #2c4553",padding:"10px clamp(16px,3vw,48px)",display:"flex",gap:18,justifyContent:"space-between",font:"600 11px ui-monospace,monospace",letterSpacing:".08em",color:"#aad8ce"}}>
      <Link href="/">← RETURN TO THE OBSERVATORY</Link>
      <span>BCPD ONE / RESEARCH STUDIO</span>
    </div>
    <ResearchWorkbench/>
  </>;
}
