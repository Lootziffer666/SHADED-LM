export function bytesToBase64(bytes:Uint8Array):string{let binary='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(binary)}
export const textBase64=(text:string)=>bytesToBase64(new TextEncoder().encode(text));
export async function blobBase64(blob:Blob){return bytesToBase64(new Uint8Array(await blob.arrayBuffer()))}
export function safeExportPath(path:string){const clean=path.replace(/\\/g,'/').split('/').filter(p=>p&&p!=='.'&&p!=='..').map(p=>p.replace(/[\u0000-\u001f:*?"<>|]/g,'_')).join('/');if(!clean)throw new Error('Invalid export path');return clean}
