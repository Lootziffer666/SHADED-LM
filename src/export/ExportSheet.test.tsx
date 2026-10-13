// @vitest-environment jsdom
import{fireEvent,render,screen}from'@testing-library/react';
import{describe,expect,it,vi}from'vitest';
import{ExportSheet}from'../ui/export/ExportSheet';

describe('ExportSheet',()=>{it('offers Index, Portable Library and Full Backup explicitly',()=>{const onExport=vi.fn();render(<ExportSheet selectionCount={2} onExport={onExport} onClose={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Index exportieren'}));expect(onExport).toHaveBeenLastCalledWith('index');fireEvent.click(screen.getByRole('button',{name:'Portable Library exportieren'}));expect(onExport).toHaveBeenLastCalledWith('portable');fireEvent.click(screen.getByRole('button',{name:'Full Backup exportieren'}));expect(onExport).toHaveBeenLastCalledWith('full')})});
