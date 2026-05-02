import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('App', () => {
  it('renders CV Builder navigation', () => {
    render(<App />);

    expect(screen.getByText('CV Builder')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Master CV')).toBeInTheDocument();
    expect(screen.getByText('Application Workspace')).toBeInTheDocument();
  });
});
