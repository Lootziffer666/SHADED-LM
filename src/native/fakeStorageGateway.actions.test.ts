import {describe,expect,it} from 'vitest';
import {FakeStorageGateway} from './fakeStorageGateway';

describe('StorageGateway external file actions',()=>{
  it('exposes file picking, sharing and open-with hooks',()=>{
    const gateway=new FakeStorageGateway() as any;
    expect(typeof gateway.chooseFiles).toBe('function');
    expect(typeof gateway.shareBundle).toBe('function');
    expect(typeof gateway.openBundle).toBe('function');
  });
});
