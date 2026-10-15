import type{LibraryDb}from'../db/libraryDb';import{INITIAL_CATEGORY_TREE,type CategoryNode as InitialNode}from'../domain/categories';
export interface CategoryNode{id:string;name:string;parentId?:string;path:string[];terminal:boolean;systemRoot:boolean;sortOrder:number}
const KEY='categoryNodesV1';const slug=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function flatten(nodes:InitialNode[],parent?:CategoryNode):CategoryNode[]{const out:CategoryNode[]=[];nodes.forEach((node,index)=>{const path=[...(parent?.path??[]),node.name];const current:CategoryNode={id:`cat:${path.map(slug).join('/')}`,name:node.name,parentId:parent?.id,path,terminal:node.terminal,systemRoot:!parent,sortOrder:index};out.push(current,...flatten(node.children??[],current))});return out}
export class CategoryService{
 constructor(private db:LibraryDb){}
 async initialize(){if(!(await this.db.settings.get(KEY)))await this.save(flatten(INITIAL_CATEGORY_TREE))}
 async all():Promise<CategoryNode[]>{await this.initialize();return((await this.db.settings.get(KEY))?.value as CategoryNode[])??[]}
 async findByPath(path:string[]){return(await this.all()).find(n=>n.path.length===path.length&&n.path.every((p,i)=>p===path[i]))}
 async children(parentId?:string){return(await this.all()).filter(n=>n.parentId===parentId).sort((a,b)=>a.sortOrder-b.sortOrder||a.name.localeCompare(b.name))}
 canConfirmDestination(node:CategoryNode){return node.path.length===1&&node.name==='Unsorted'||!node.systemRoot&&node.terminal}
 async createCategory(parentId:string,name:string):Promise<CategoryNode>{const clean=name.trim();if(!clean)throw new Error('Category name is required');const nodes=await this.all(),parent=nodes.find(n=>n.id===parentId);if(!parent)throw new Error('Parent category not found');if(nodes.some(n=>n.parentId===parentId&&n.name.toLowerCase()===clean.toLowerCase()))throw new Error('Category already exists');const path=[...parent.path,clean],siblings=nodes.filter(n=>n.parentId===parentId);const node:CategoryNode={id:`cat:${path.map(slug).join('/')}:${crypto.randomUUID().slice(0,8)}`,name:clean,parentId,path,terminal:true,systemRoot:false,sortOrder:siblings.length};await this.save([...nodes,node]);return node}
 async renameCategory(id:string,name:string){const clean=name.trim();if(!clean)throw new Error('Category name is required');const nodes=await this.all(),node=nodes.find(n=>n.id===id);if(!node)throw new Error('Category not found');if(node.systemRoot)throw new Error('System roots cannot be renamed');const old=node.path,newPath=[...old.slice(0,-1),clean];const updated=nodes.map(n=>n.id===id?{...n,name:clean,path:newPath}:n.path.slice(0,old.length).every((p,i)=>p===old[i])?{...n,path:[...newPath,...n.path.slice(old.length)]}:n);await this.save(updated)}
 private save(nodes:CategoryNode[]){return this.db.settings.put({key:KEY,value:nodes})}
}
