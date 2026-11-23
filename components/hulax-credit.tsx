import { ArrowUpRight } from "lucide-react";

type HuLaXCreditProps = {
  placement?: "header" | "footer";
};

/** Shared project attribution used across the HuLaX project family. */
export function HuLaXCredit({ placement = "header" }: HuLaXCreditProps) {
  return (
    <a
      className={`hlx-credit hlx-credit-${placement}`}
      href="https://hulax.vercel.app"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="A Project By HuLaX — open the HuLaX portfolio"
    >
      <span className="hlx-credit-overline">A PROJECT BY</span>
      <span className="hlx-credit-name">HuLaX <ArrowUpRight size={placement === "footer" ? 15 : 12} aria-hidden="true" /></span>
    </a>
  );
}
