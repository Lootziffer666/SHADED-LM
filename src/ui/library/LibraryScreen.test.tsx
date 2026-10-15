// @vitest-environment jsdom
import'fake-indexeddb/auto';
import{fireEvent,render,screen,waitFor,within}from'@testing-library/react';
import{describe,expect,it}from'vitest';
import{LibraryDb}from'../../db/libraryDb';
import type{AssetRecord}from'../../domain/library';
import{LibraryScreen}from'./LibraryScreen';

const asset=(id:string,categoryPath:string[]=['Unsorted']):AssetRecord=>({id,displayName:id,primaryFormat:'glb',primarySourceRef:{kind:'saf-document',grantId:'g',documentId:id,name:`${id}.glb`,size:123},bundleId:`b:${id}`,categoryPath,tags:[],favorite:false,fingerprint:id,createdAt:1,updatedAt:1});

describe('LibraryScreen navigation',()=>{
 it('uses semantic categories as the primary row and expands children horizontally',async()=>{
  const db=new LibraryDb(`nav-${crypto.randomUUID()}`);await db.assets.bulkPut([asset('Woman',['Characters','Humans','Women']),asset('Oak',['Vegetation','Trees'])]);render(<LibraryScreen db={db}/>);
  await screen.findByText('Woman');
  expect(await screen.findByRole('button',{name:'Characters'})).toBeTruthy();expect(screen.getByRole('button',{name:'Animals'})).toBeTruthy();expect(screen.getByLabelText('Technische Filter')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Characters'}));await screen.findByRole('button',{name:'Humans'});fireEvent.click(screen.getByRole('button',{name:'Humans'}));await screen.findByRole('button',{name:'Women'});
  await waitFor(()=>expect(screen.queryByText('Oak')).toBeNull());await db.delete();
 });
});

describe('LibraryScreen tag workflow',()=>{
 it('chooses a category first, then selects assets, confirms, clears selection and exits',async()=>{
  const db=new LibraryDb(`tag-${crypto.randomUUID()}`);await db.assets.bulkPut([asset('Village Woman'),asset('Blacksmith')]);render(<LibraryScreen db={db}/>);
  await screen.findByText('Village Woman');fireEvent.click(screen.getByRole('button',{name:'Tag-Modus'}));
  const dialog=await screen.findByRole('dialog',{name:'Rubrik wählen'});const picker=within(dialog);fireEvent.click(await picker.findByRole('button',{name:'Characters'}));fireEvent.click(await picker.findByRole('button',{name:'Humans'}));fireEvent.click(await picker.findByRole('button',{name:'Women'}));fireEvent.click(picker.getByRole('button',{name:'Rubrik wählen bestätigen'}));
  fireEvent.click(screen.getByRole('button',{name:'Village Woman auswählen'}));fireEvent.click(screen.getByRole('button',{name:'Blacksmith auswählen'}));expect(screen.getByText('2 gewählt')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Auswahl bestätigen'}));
  await waitFor(async()=>{expect((await db.assets.get('Village Woman'))?.categoryPath).toEqual(['Characters','Humans','Women']);expect((await db.assets.get('Blacksmith'))?.categoryPath).toEqual(['Characters','Humans','Women'])});
  expect(screen.queryByText('2 gewählt')).toBeNull();expect(screen.getByRole('button',{name:'Tag-Modus'}).getAttribute('aria-pressed')).toBe('false');await db.delete();
 });
});
