// @vitest-environment jsdom
import'fake-indexeddb/auto';
import{fireEvent,render,screen,waitFor}from'@testing-library/react';
import{describe,expect,it}from'vitest';
import{LibraryDb}from'../../db/libraryDb';
import type{AssetRecord}from'../../domain/library';
import{LibraryScreen}from'./LibraryScreen';

const asset=(id:string,tags:string[]):AssetRecord=>({id,displayName:id,primaryFormat:'glb',primarySourceRef:{kind:'saf-document',grantId:'g',documentId:id,name:`${id}.glb`,size:123},bundleId:`b:${id}`,categoryPath:['Unsorted'],tags,favorite:false,fingerprint:id,createdAt:1,updatedAt:1});

describe('LibraryScreen tag workflow',()=>{
 it('toggles tag mode, selects, confirms edits, clears selection and switches tag mode off',async()=>{
  const db=new LibraryDb(`ui-${crypto.randomUUID()}`);await db.assets.bulkPut([asset('Village Woman',['medieval']),asset('Blacksmith',['medieval','worker'])]);render(<LibraryScreen db={db}/>);
  await screen.findByText('Village Woman');fireEvent.click(screen.getByRole('button',{name:'Tag-Modus'}));
  fireEvent.click(screen.getByRole('button',{name:'Village Woman auswählen'}));fireEvent.click(screen.getByRole('button',{name:'Blacksmith auswählen'}));expect(screen.getByText('2 gewählt')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Tags bearbeiten'}));fireEvent.change(screen.getByLabelText('Neuer Tag'),{target:{value:'night'}});fireEvent.click(screen.getByRole('button',{name:'Tag hinzufügen'}));fireEvent.click(screen.getByRole('button',{name:'Tags bestätigen'}));
  await waitFor(async()=>{expect((await db.assets.get('Village Woman'))?.tags).toContain('night');expect((await db.assets.get('Blacksmith'))?.tags).toContain('night')});
  await waitFor(()=>expect(screen.queryByText('2 gewählt')).toBeNull());expect(screen.getByRole('button',{name:'Tag-Modus'}).getAttribute('aria-pressed')).toBe('false');await db.delete();
 });
});
