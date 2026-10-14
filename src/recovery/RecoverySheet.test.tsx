// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecoverySheet } from '../ui/recovery/RecoverySheet';

describe('RecoverySheet', () => {
  it('offers retry and source reconnect for relevant failures', async () => {
    const retry = vi.fn();
    const reconnect = vi.fn();

    render(
      <RecoverySheet
        state={{ failedJobs: 2, resumableJobs: 1, unavailableAssets: 3, needsAttention: true }}
        onRetry={retry}
        onReconnect={reconnect}
        onClose={() => {}}
      />,
    );

    expect(screen.getByLabelText('2 fehlgeschlagen')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Verarbeitung fortsetzen' }));
    });
    expect(retry).toHaveBeenCalledOnce();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Quelle neu verbinden' }));
    });
    expect(reconnect).toHaveBeenCalledOnce();
  });
});
