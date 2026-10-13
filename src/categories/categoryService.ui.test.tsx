// @vitest-environment jsdom
import'fake-indexeddb/auto';
import{fireEvent,render,screen,waitFor}from'@testing-library/react';
import{describe,expect,it,vi}from'vitest';
import{LibraryDb}from'../db/libraryDb';
import{CategoryService}from'./categoryService';
import{CascadePicker}from'../ui/categories/CascadePicker';

describe('CascadePicker',()=>{
 it('requires a terminal child for managed roots and permits Unsorted directly',async()=>{
  const db=new LibraryDb(`picker-${crypto.randomUUID()}`);const service=new CategoryService(db);const onConfirm=vi.fn();render(<CascadePicker service={service} onConfirm={onConfirm}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Characters'}));
  const confirm=screen.getByRole('button',{name:'Ziel bestätigen'}) as HTMLButtonElement;expect(confirm.disabled).toBe(true);
  fireEvent.click(await screen.findByRole('button',{name:'Humans'}));fireEvent.click(await screen.findByRole('button',{name:'Men'}));expect(confirm.disabled).toBe(false);fireEvent.click(confirm);
  await waitFor(()=>expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({path:['Characters','Humans','Men']})));
  await db.delete();
 });
 it('can create and immediately select a lore branch',async()=>{
  const db=new LibraryDb(`picker-${crypto.randomUUID()}`);const service=new CategoryService(db);const onConfirm=vi.fn();render(<CascadePicker service={service} onConfirm={onConfirm}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Characters'}));fireEvent.change(screen.getByLabelText('Unterordner erstellen'),{target:{value:'Mirefolk'}});fireEvent.click(screen.getByRole('button',{name:'Erstellen'}));
  fireEvent.click(await screen.findByRole('button',{name:'Mirefolk'}));fireEvent.click(screen.getByRole('button',{name:'Ziel bestätigen'}));await waitFor(()=>expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({path:['Characters','Mirefolk']})));await db.delete();
 });
});
