import Link from "next/link";
import type { Metadata } from "next";
import { ResearchWorkbench } from "@/components/research-workbench";

export const metadata: Metadata = {
  title: "Research Studio | BCPD One",
  description: "A detailed historical analysis workbench with CSV import, model settings, sensitivity diagnostics, correlation and export tools.",
};

export default function ResearchStudioPage() {
  return <>
    <div className="ob-studio-return">
      <Link href="/">← OBSERVATORY</Link>
      <span>DEEP RESEARCH MODE / RETROSPECTIVE MODEL</span>
    </div>
    <ResearchWorkbench />
  </>;
}
