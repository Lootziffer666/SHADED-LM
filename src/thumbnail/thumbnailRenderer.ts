import{AmbientLight,Box3,Color,DirectionalLight,PerspectiveCamera,Scene,SRGBColorSpace,Vector3,WebGLRenderer}from'three';
import type{LoadedAssetSession}from'../three/loadMaterializedAsset';

export interface ThumbnailOptions{width?:number;height?:number;background?:number}
export function fitDistanceForBounds(bounds:{x:number;y:number;z:number},fovDeg=35,aspect=1):number{const halfY=Math.max(bounds.y/2,0.01),halfX=Math.max(bounds.x/2,0.01),tan=Math.tan(fovDeg*Math.PI/360);return Math.max(halfY/tan,halfX/(tan*Math.max(aspect,0.01)))+Math.max(bounds.z/2,0.2)*1.35}
const canvasBlob=(canvas:HTMLCanvasElement,type='image/webp',quality=.86)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Canvas encoding failed')),type,quality));

export async function renderThumbnail(session:LoadedAssetSession,options:ThumbnailOptions={}):Promise<Blob>{
 const width=options.width??256,height=options.height??256,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const renderer=new WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(width,height,false);renderer.outputColorSpace=SRGBColorSpace;
 const scene=new Scene();scene.background=new Color(options.background??0xf3f6fb);const box=new Box3().setFromObject(session.root);if(box.isEmpty())throw new Error('Asset has no renderable bounds');const center=new Vector3(),size=new Vector3();box.getCenter(center);box.getSize(size);const camera=new PerspectiveCamera(35,width/height,.01,Math.max(1000,size.length()*20));const distance=fitDistanceForBounds(size,35,width/height);camera.position.set(center.x+distance*.55,center.y+size.y*.12,center.z+distance);camera.lookAt(center);scene.add(new AmbientLight(0xffffff,1.65));const key=new DirectionalLight(0xffffff,2.25);key.position.set(center.x+4,center.y+6,center.z+5);scene.add(key);const rim=new DirectionalLight(0xb9d9ff,1.1);rim.position.set(center.x-5,center.y+3,center.z-4);scene.add(rim);
 const parent=session.root.parent;scene.add(session.root);try{renderer.render(scene,camera);return await canvasBlob(canvas)}finally{scene.remove(session.root);if(parent)parent.add(session.root);renderer.dispose()}
}

export async function renderFallbackThumbnail(label='ASSET',width=256,height=256):Promise<Blob>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');if(!c)throw new Error('2D canvas unavailable');c.fillStyle='#f0f3ff';c.fillRect(0,0,width,height);c.fillStyle='#0050cb';c.font='600 22px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(label,width/2,height/2);return canvasBlob(canvas)}
