import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BCPD One | Regime Intelligence",
  description: "Evidence-led Bayesian change-point research across international equity indices and digital assets.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
