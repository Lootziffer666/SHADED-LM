import{useEffect,useMemo,useState}from'react';
import'./styles/tokens.css';
import{libraryDb}from'./db/libraryDb';
import{CapacitorStorageGateway}from'./native/capacitorStorageGateway';
import{recoverMoves}from'./move/moveService';
import{ImportScreen}from'./ui/ImportScreen';
import{LibraryScreen}from'./ui/library/LibraryScreen';
import{ViewerScreen}from'./viewer/ViewerScreen';

export default function App(){const[library,setLibrary]=useState(false),[assetId,setAssetId]=useState<string>(),gateway=useMemo(()=>new CapacitorStorageGateway(),[]);useEffect(()=>{void libraryDb.assets.count().then(count=>setLibrary(count>0));void recoverMoves(libraryDb,gateway)},[gateway]);if(assetId)return <ViewerScreen assetId={assetId} db={libraryDb} gateway={gateway} onBack={()=>setAssetId(undefined)}/>;return library?<LibraryScreen db={libraryDb} gateway={gateway} onOpen={asset=>setAssetId(asset.id)} onRescan={()=>setLibrary(false)}/>:<ImportScreen db={libraryDb} gateway={gateway} onLibraryReady={()=>setLibrary(true)}/>}
