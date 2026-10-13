// @vitest-environment jsdom
import{fireEvent,render,screen}from'@testing-library/react';
import{describe,expect,it,vi}from'vitest';
import{RecoverySheet}from'../ui/recovery/RecoverySheet';

describe('RecoverySheet',()=>{it('offers retry and source reconnect for relevant failures',()=>{const retry=vi.fn(),reconnect=vi.fn();render(<RecoverySheet state={{failedJobs:2,resumableJobs:1,unavailableAssets:3,needsAttention:true}} onRetry={retry} onReconnect={reconnect} onClose={()=>{}}/>);expect(screen.getByText(/2 fehlgeschlagen/)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Verarbeitung fortsetzen'}));expect(retry).toHaveBeenCalledOnce();fireEvent.click(screen.getByRole('button',{name:'Quelle neu verbinden'}));expect(reconnect).toHaveBeenCalledOnce()})});
