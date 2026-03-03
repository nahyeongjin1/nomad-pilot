import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('smoke test', () => {
  it('renders in jsdom environment', () => {
    render(<h1>Hello Nomad-Pilot</h1>);
    expect(screen.getByText('Hello Nomad-Pilot')).toBeInTheDocument();
  });
});
