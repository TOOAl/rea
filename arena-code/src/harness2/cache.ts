import { createHash } from "node:crypto";
export function argonCacheKey(system: string, skillsIndex: string): string { return createHash("sha256").update(system+"\n"+skillsIndex).digest("hex").slice(0,16); }
export class ArgonCache {
  private map = new Map<string, { hits:number }>();
  private total=0;
  touch(system: string, skillsIndex: string): { hit:boolean; savedRatio:number } {
    const k=argonCacheKey(system, skillsIndex);
    this.total++;
    const e=this.map.get(k);
    if (e) { e.hits++; return { hit:true, savedRatio:0.95 }; }
    this.map.set(k,{hits:1}); return { hit:false, savedRatio:0 };
  }
  stats(): { keys:number; totalHits:number } { let t=0; for(const v of this.map.values()) t+=v.hits; return { keys:this.map.size, totalHits:t>0?t:this.total }; }
}
