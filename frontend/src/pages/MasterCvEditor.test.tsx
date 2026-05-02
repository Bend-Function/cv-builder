/// <reference types="@testing-library/jest-dom/vitest" />

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { message } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMasterCv, saveMasterCv } from '../api/masterCv';
import type { MasterCv } from '../types/masterCv';
import MasterCvEditor from './MasterCvEditor';

vi.mock('../api/masterCv', () => ({
  getMasterCv: vi.fn(),
  saveMasterCv: vi.fn()
}));

const masterCv: MasterCv = {
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function stubMatchMedia() {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

const getMasterCvMock = vi.mocked(getMasterCv);
const saveMasterCvMock = vi.mocked(saveMasterCv);

describe('MasterCvEditor', () => {
  beforeEach(() => {
    stubMatchMedia();
    getMasterCvMock.mockReset();
    saveMasterCvMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('disables saving before load and enables it after fields load', async () => {
    const loadMasterCv = deferred<MasterCv>();
    getMasterCvMock.mockReturnValue(loadMasterCv.promise);

    render(<MasterCvEditor />);

    const saveButton = screen.getByRole('button', { name: /save master cv/i });
    expect(saveButton).toBeDisabled();

    loadMasterCv.resolve(masterCv);

    await waitFor(() => expect(screen.getByDisplayValue('Alex Chen')).toBeInTheDocument());
    expect(screen.getByDisplayValue('https://github.com/alexchen')).toBeInTheDocument();
    expect(saveButton).toBeEnabled();
  });

  it('saves the loaded master CV merged with submitted form values', async () => {
    const user = userEvent.setup();
    const savedMasterCv = {
      ...masterCv,
      profile: {
        ...masterCv.profile,
        full_name: 'Jordan Smith'
      }
    };
    getMasterCvMock.mockResolvedValue(masterCv);
    saveMasterCvMock.mockResolvedValue(savedMasterCv);

    render(<MasterCvEditor />);

    const nameInput = await screen.findByDisplayValue('Alex Chen');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jordan Smith');
    await user.click(screen.getByRole('button', { name: /save master cv/i }));

    await waitFor(() => expect(saveMasterCvMock).toHaveBeenCalledWith(savedMasterCv));
  });

  it('shows an error when loading fails', async () => {
    const messageError = vi
      .spyOn(message, 'error')
      .mockImplementation(() => undefined as unknown as ReturnType<typeof message.error>);
    getMasterCvMock.mockRejectedValue(new Error('load failed'));

    render(<MasterCvEditor />);

    await waitFor(() => expect(messageError).toHaveBeenCalledWith('Unable to load master CV'));
    expect(screen.getByRole('button', { name: /save master cv/i })).toBeDisabled();
  });

  it('shows an error and re-enables saving when saving fails', async () => {
    const user = userEvent.setup();
    const messageError = vi
      .spyOn(message, 'error')
      .mockImplementation(() => undefined as unknown as ReturnType<typeof message.error>);
    getMasterCvMock.mockResolvedValue(masterCv);
    saveMasterCvMock.mockRejectedValue(new Error('save failed'));

    render(<MasterCvEditor />);

    await screen.findByDisplayValue('Alex Chen');
    const saveButton = screen.getByRole('button', { name: /save master cv/i });
    await user.click(saveButton);

    await waitFor(() => expect(messageError).toHaveBeenCalledWith('Unable to save master CV'));
    expect(saveButton).toBeEnabled();
  });
});
