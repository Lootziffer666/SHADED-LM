import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('application shell', () => {
  it('renders the local library identity without requiring network UI assets', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'SHADED-LM' })).toBeInTheDocument();
    expect(screen.getByText('Local 3D Asset Library')).toBeInTheDocument();
  });
});
