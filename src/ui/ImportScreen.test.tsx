// @vitest-environment jsdom
import'fake-indexeddb/auto';
import{fireEvent,render,screen}from'@testing-library/react';
import{describe,expect,it}from'vitest';
import{LibraryDb}from'../db/libraryDb';
import{FakeStorageGateway}from'../native/fakeStorageGateway';
import{ImportScreen}from'./ImportScreen';

describe('ImportScreen progress',()=>{
 it('keeps an explicit progress surface and source-add control visible',async()=>{
  const db=new LibraryDb(`import-ui-${crypto.randomUUID()}`);render(<ImportScreen db={db} gateway={new FakeStorageGateway()}/>);
  expect(await screen.findByLabelText('Scan-Fortschritt')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Quelle hinzufügen'})).toBeTruthy();
  expect(screen.getByLabelText('Technische Filter')).toBeTruthy();
  await db.delete();
 });
 it('offers the Download root separately from the SAF folder picker',async()=>{
  const db=new LibraryDb(`source-ui-${crypto.randomUUID()}`);render(<ImportScreen db={db} gateway={new FakeStorageGateway()}/>);await screen.findByLabelText('Scan-Fortschritt');
  fireEvent.click(screen.getByRole('button',{name:'Quelle hinzufügen'}));
  expect(screen.getByRole('button',{name:'Ordner auswählen'})).toBeTruthy();
  expect(screen.getByRole('button',{name:'Download-Ordner'})).toBeTruthy();
  await db.delete();
 });
});
