import type { Study } from "./analysis";

export type EvidenceCell = {
  week: string;
  close: number;
  returnPct: number;
  resetProbability: number;
  stableCandidate: boolean;
};
export type EvidenceRow = {
  id: string;
  label: string;
  cells: (EvidenceCell | null)[];
};
export type EvidenceMatrix = {weeks: string[]; rows: EvidenceRow[]};

export function buildEvidenceMatrix(studies: Study[], limit=24): EvidenceMatrix {
  if (!Number.isInteger(limit) || limit < 4 || limit > 104) throw Error("Matrix window must be 4–104 weeks");
  const weeks=[...new Set(studies.flatMap(s=>s.returns.map(r=>r.date)))].sort().slice(-limit);
  return {weeks, rows: studies.map(study=>{
    const indices=new Map(study.returns.map((r,i)=>[r.date,i]));
    const stable=new Set(study.analysis.consensus.filter(c=>c.share>=2/3).map(c=>study.returns[c.index]?.date).filter(Boolean));
    return {id:study.asset.id,label:study.asset.label,cells:weeks.map(week=>{
      const i=indices.get(week);
      if(i===undefined) return null;
      const row=study.returns[i];
      const prob=study.analysis.probabilities[i];
      if(!row || !Number.isFinite(prob) || prob<0 || prob>1) return null;
      return {week,close:row.close,returnPct:row.returnPct,resetProbability:prob,stableCandidate:stable.has(week)};
    })};
  })};
}

export function latestEvidence(study: Study): EvidenceCell | null {
  const index=study.returns.length-1;
  if(index<0) return null;
  const row=study.returns[index];
  const resetProbability=study.analysis.probabilities[index];
  if(!Number.isFinite(resetProbability) || resetProbability<0 || resetProbability>1) return null;
  const stable=new Set(study.analysis.consensus.filter(c=>c.share>=2/3).map(c=>c.index));
  return {week:row.date,close:row.close,returnPct:row.returnPct,resetProbability,stableCandidate:stable.has(index)};
}

export function verifiedPeaks(study:Study){
  return study.analysis.consensus.filter(p=>p.share>=2/3 && Boolean(study.returns[p.index])).map(p=>({
    week:study.returns[p.index].date,support:p.support,total:p.total,
    resetProbability:study.analysis.probabilities[p.index],
    returnPct:study.returns[p.index].returnPct
  })).sort((a,b)=>b.week.localeCompare(a.week));
}
