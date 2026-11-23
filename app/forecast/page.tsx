import type { Metadata } from "next";
import { ForecastLab } from "@/components/forecast-lab";
import "../observatory.css";
import "./forecast.css";
import "./forecast-v3.css";

export const metadata:Metadata={
  alternates: { canonical: "/forecast" },
  title:"Forecast Lab | BCPD One",
  description:"Future weekly price distributions, model uncertainty, and historical rolling-origin diagnostics. Exploratory baseline only.",
};
export default function ForecastPage(){return <ForecastLab/>;}
