/// <reference types="@testing-library/jest-dom/vitest" />

import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MasterCvEditor from './MasterCvEditor';

const masterCv = {
  profile: {
    full_name: 'Alex Chen',
    email: 'alex@example.com',
    github_url: 'https://github.com/alexchen',
    linkedin_url: 'https://linkedin.com/in/alexchen',
    portfolio_url: ''
  },
  work_experience: [],
  projects: []
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MasterCvEditor', () => {
  it('loads profile fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => masterCv }));
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));

    render(<MasterCvEditor />);

    await waitFor(() => expect(screen.getByDisplayValue('Alex Chen')).toBeInTheDocument());
    expect(screen.getByDisplayValue('https://github.com/alexchen')).toBeInTheDocument();
  });
});
