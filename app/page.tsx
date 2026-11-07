import type { Metadata } from "next";
import { Observatory } from "@/components/observatory";
import "./observatory.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "The Observatory | BCPD One",
  description: "Investigate historical market shifts through source-attributed observations, transparent Bayesian research and reproducible evidence.",
};

export default function Home() {
  return <Observatory />;
}
