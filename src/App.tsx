import{useEffect,useState}from'react';
import'./styles/tokens.css';
import{libraryDb}from'./db/libraryDb';
import{ImportScreen}from'./ui/ImportScreen';
import{LibraryScreen}from'./ui/library/LibraryScreen';

export default function App(){const[library,setLibrary]=useState(false);useEffect(()=>{void libraryDb.assets.count().then(count=>setLibrary(count>0))},[]);return library?<LibraryScreen db={libraryDb} onRescan={()=>setLibrary(false)}/>:<ImportScreen db={libraryDb} onLibraryReady={()=>setLibrary(true)}/>}
