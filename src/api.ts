const BASE=import.meta.env.VITE_API_BASE_URL||'http://localhost:8080';
export type Mission={missionId:string;workflowId:string;droneId:string;destination:string;status:string;createdAt:string;message?:string};
export type Waypoint={latitude:number;longitude:number};
export async function getMissions():Promise<Mission[]>{const r=await fetch(`${BASE}/api/missions`);if(!r.ok)throw new Error(await r.text()||`API error ${r.status}`);return r.json();}
export async function createMission(body:{droneId:string;destination:string;waypoints:Waypoint[]}):Promise<Mission>{const r=await fetch(`${BASE}/api/missions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text()||`API error ${r.status}`);return r.json();}
export async function abortMission(id:string):Promise<Mission>{const r=await fetch(`${BASE}/api/missions/${encodeURIComponent(id)}/abort`,{method:'POST'});if(!r.ok)throw new Error(await r.text()||`API error ${r.status}`);return r.json();}
