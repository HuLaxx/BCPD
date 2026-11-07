"use client";

import { useState, useSyncExternalStore } from "react";
import { BookmarkPlus, Check, Download, FolderOpen, Trash2 } from "lucide-react";
import {
  makePreset, parsePresetLibrary, PRESET_STORAGE_KEY,
  type StudyConfig, type StudyPreset
} from "@/lib/presets";

type Props = {
  config: StudyConfig;
  onApply: (config: StudyConfig) => void;
};

const PRESETS_CHANGED = "bcpd-one-presets-changed";
function subscribePresets(onChange:()=>void):()=>void{
  window.addEventListener("storage",onChange);
  window.addEventListener(PRESETS_CHANGED,onChange);
  return ()=>{
    window.removeEventListener("storage",onChange);
    window.removeEventListener(PRESETS_CHANGED,onChange);
  };
}
function getPresets():string {
  try {return window.localStorage.getItem(PRESET_STORAGE_KEY)??"[]";}
  catch{return "[]";}
}
function getServerPresets():string {return "[]";}

export function PresetStudio({ config, onApply }: Props) {
  const [name, setName] = useState("");
  const snapshot=useSyncExternalStore(subscribePresets,getPresets,getServerPresets);
  const presets:StudyPreset[]=parsePresetLibrary(snapshot);
  const [message, setMessage] = useState("");
  const [storageAvailable, setStorageAvailable] = useState(true);

  function persist(items: StudyPreset[]) {
    try {
      window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new Event(PRESETS_CHANGED));
    } catch {
      setStorageAvailable(false);
      setMessage("Unable to save: browser storage is blocked or full.");
    }
  }
  function save() {
    try {
      if(presets.length >= 30) throw Error("The workspace stores at most 30 presets.");
      const preset = makePreset(name, config, crypto.randomUUID(), new Date().toISOString());
      persist([preset,...presets]);
      setName("");
      setMessage("Research preset saved in this browser.");
    } catch(error) {
      setMessage(error instanceof Error ? error.message : "Unable to save this preset.");
    }
  }
  function download() {
    const content=JSON.stringify({
      format: "bcpd-one-presets-v1", exportedAt: new Date().toISOString(),
      presets
    },null,2);
    const url=URL.createObjectURL(new Blob([content],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download="bcpd-one-workspaces.json";link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    setMessage("Workspace presets exported. No market observations are included.");
  }

  return <section className="preset-panel panel" aria-labelledby="presets-heading">
    <div className="panel-heading">
      <div><span className="section-kicker">RESEARCH WORKSPACES</span><h2 id="presets-heading">Pick up where you left off.</h2>
        <p>Save market selections and model settings locally. Presets never include private CSV contents or historical prices.</p></div>
      <FolderOpen className="heading-icon" size={21}/>
    </div>
    <div className="preset-controls">
      <label className="preset-name-label" htmlFor="preset-name">PRESET NAME</label>
      <input id="preset-name" value={name} maxLength={60} disabled={!storageAvailable}
        onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")save()}}
        placeholder="e.g. Global macro regime study"/>
      <button type="button" className="outline-btn" onClick={save} disabled={!storageAvailable || !config.selected.length || !name.trim()}>
        <BookmarkPlus size={15}/> SAVE WORKSPACE
      </button>
      <button type="button" className="outline-btn" disabled={!presets.length} onClick={download}>
        <Download size={15}/> EXPORT PRESETS
      </button>
    </div>
    {presets.length>0?<div className="presets-list" aria-label="Saved research presets">
      {presets.map(preset=><div className="preset-item" key={preset.id}>
        <div className="preset-description"><strong>{preset.name}</strong>
          <span>{preset.config.selected.length} markets · {preset.config.range} · {preset.config.hazard} week hazard · {preset.config.threshold}% threshold</span>
        </div>
        <button type="button" className="preset-apply" onClick={()=>{
          onApply({ ...preset.config, selected:[...preset.config.selected] });
          setMessage("Applied "+preset.name+". Run research to load current observations.");
        }}><Check size={14}/> APPLY</button>
        <button type="button" className="preset-delete" aria-label={"Delete "+preset.name}
          onClick={()=>{persist(presets.filter(p=>p.id!==preset.id));setMessage("Preset deleted from this browser.");}}>
          <Trash2 size={15}/>
        </button>
      </div>)}
    </div>:<p className="preset-empty">No saved workspaces yet. Save a configuration to reuse it later on this device.</p>}
    {message&&<p className="preset-message" role="status">{message}</p>}
  </section>;
}
