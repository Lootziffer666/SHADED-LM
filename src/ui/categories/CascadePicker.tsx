import{useEffect,useState}from'react';
import type{CategoryNode,CategoryService}from'../../categories/categoryService';

export function CascadePicker({service,onConfirm,onClose,dialogLabel='Zielordner wählen',eyebrow='Verschieben nach',confirmLabel='Ziel bestätigen'}:{service:CategoryService;onConfirm:(node:CategoryNode)=>void|Promise<void>;onClose?:()=>void;dialogLabel?:string;eyebrow?:string;confirmLabel?:string}){
 const[options,setOptions]=useState<CategoryNode[]>([]),[trail,setTrail]=useState<CategoryNode[]>([]),[selected,setSelected]=useState<CategoryNode>(),[newName,setNewName]=useState(''),[busy,setBusy]=useState(false);
 const load=async(parentId?:string)=>setOptions(await service.children(parentId));
 useEffect(()=>{void load()},[service]);
 const choose=async(node:CategoryNode)=>{setSelected(node);setTrail(current=>[...current,node]);const children=await service.children(node.id);setOptions(children)};
 const back=async()=>{const next=trail.slice(0,-1);setTrail(next);setSelected(next.at(-1));await load(next.at(-1)?.id)};
 const create=async()=>{if(!selected||!newName.trim())return;setBusy(true);try{await service.createCategory(selected.id,newName);setNewName('');await load(selected.id)}finally{setBusy(false)}};
 const confirmable=selected?service.canConfirmDestination(selected):false;
 return <section className="sheet cascade-sheet" role="dialog" aria-label={dialogLabel}><header className="sheet-head"><button className="ghost" onClick={trail.length?back:onClose} aria-label="Zurück">←</button><div><span className="eyebrow">{eyebrow}</span><strong>{trail.length?trail.map(n=>n.name).join(' / '):'Kategorie wählen'}</strong></div>{onClose&&<button className="ghost" onClick={onClose} aria-label="Schließen">×</button>}</header><div className="cascade-options">{options.map(node=><button key={node.id} className="cascade-row" onClick={()=>choose(node)} aria-label={node.name}><span>{node.name}</span><span>{node.terminal?'✓':'›'}</span></button>)}</div>{selected&&!selected.terminal&&<div className="create-row"><input aria-label="Unterordner erstellen" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Neuer Unterordner"/><button onClick={create} disabled={busy||!newName.trim()} aria-label="Erstellen">Erstellen</button></div>}<footer className="sheet-actions"><button className="secondary" onClick={onClose}>Abbrechen</button><button className="cta" disabled={!confirmable||busy} onClick={()=>selected&&onConfirm(selected)} aria-label={confirmLabel}>{confirmLabel}</button></footer></section>
}
