// @vitest-environment jsdom
import'fake-indexeddb/auto';
import{render,screen}from'@testing-library/react';
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
});
