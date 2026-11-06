import { ASSETS } from "./universe";

export const PRESET_STORAGE_KEY = "bcpd-one.presets.v1";
export type Range = "1y" | "2y" | "5y";
export type StudyConfig = {
  selected: string[];
  range: Range;
  hazard: number;
  threshold: number;
};
export type StudyPreset = {
  id: string;
  name: string;
  createdAt: string;
  config: StudyConfig;
};
const available = new Set(ASSETS.map(x => x.id));
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function isStudyConfig(value: unknown): value is StudyConfig {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.selected) || !value.selected.length || value.selected.length > ASSETS.length) return false;
  if (!value.selected.every(id => typeof id === "string" && available.has(id))) return false;
  if (new Set(value.selected).size !== value.selected.length) return false;
  if (!["1y", "2y", "5y"].includes(String(value.range))) return false;
  return typeof value.hazard === "number" && Number.isInteger(value.hazard) && value.hazard >= 12 && value.hazard <= 100 &&
    typeof value.threshold === "number" && Number.isInteger(value.threshold) && value.threshold >= 5 && value.threshold <= 80;
}
export function isStudyPreset(value: unknown): value is StudyPreset {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0 && value.id.length <= 100 &&
    typeof value.name === "string" && value.name.trim().length > 0 && value.name.length <= 60 &&
    typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt)) &&
    isStudyConfig(value.config);
}
export function parsePresetLibrary(raw: string | null): StudyPreset[] {
  if (!raw || raw.length > 150000) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const unique = new Map<string, StudyPreset>();
    for (const item of parsed.slice(0, 100)) if (isStudyPreset(item) && !unique.has(item.id)) {
      unique.set(item.id, {
        id: item.id, name: item.name.trim(), createdAt: item.createdAt,
        config: { ...item.config, selected: [...item.config.selected] }
      });
    }
    return [...unique.values()].slice(0, 30);
  } catch {
    return [];
  }
}
export function makePreset(name: string, config: StudyConfig, id: string, createdAt: string): StudyPreset {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 60);
  const preset = { id, name: clean, createdAt, config: { ...config, selected: [...config.selected] } };
  if (!isStudyPreset(preset)) throw new Error("Enter a name and select valid research settings.");
  return preset;
}
