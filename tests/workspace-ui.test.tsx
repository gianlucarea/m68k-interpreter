import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/components/App';
import Output from '../src/components/Output';
import { useEmulatorStore } from '../src/stores/emulatorStore';
import { useChangedValues } from '../src/hooks/useChangedValues';

vi.mock('../src/components/AceM68kEditor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      aria-label="Assembly editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    clear: () => storage.clear(),
  });
  useEmulatorStore.getState().reset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function workspace() {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('textbox', { name: 'Assembly editor' });
  return user;
}

describe('Precision workspace', () => {
  it('defaults to dark and persists the selected theme across remounts', async () => {
    const user = await workspace();
    expect(document.documentElement.dataset.theme).toBe('dark');
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('m68k-theme')).toBe('light');
    cleanup();
    await workspace();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('navigates inspector tabs with the keyboard and preserves memory navigation', async () => {
    const user = await workspace();
    await user.click(screen.getByRole('tab', { name: /Registers/ }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Memory/ }).getAttribute('aria-selected')).toBe('true');
    const address = screen.getByLabelText('Start Address');
    await user.clear(address);
    await user.type(address, '2000{Enter}');
    expect(screen.getByText('0x00002000')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: /Flags/ }));
    expect(screen.getByText('Condition codes')).toBeTruthy();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: /Registers/ }).getAttribute('aria-selected')).toBe(
      'true'
    );
    await user.click(screen.getByRole('tab', { name: /Memory/ }));
    expect((screen.getByLabelText('Start Address') as HTMLInputElement).value).toBe('0x00002000');
    await user.clear(address);
    await user.type(address, 'nope{Enter}');
    expect(address.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('0x00002000')).toBeTruthy();
  });

  it('loads examples using the keyboard and resets source independently of execution reset', async () => {
    const user = await workspace();
    const editor = screen.getByRole('textbox', { name: 'Assembly editor' }) as HTMLTextAreaElement;
    const starter = editor.value;
    await user.click(screen.getByRole('button', { name: /Examples/ }));
    expect(document.activeElement?.getAttribute('role')).toBe('menuitem');
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Examples/ }));
    await user.keyboard('{ArrowDown}{Home}{Enter}');
    expect(editor.value).not.toBe(starter);
    expect(screen.queryByRole('menu')).toBeNull();
    const example = editor.value;
    await user.click(screen.getByRole('button', { name: 'Reset', exact: true }));
    expect(editor.value).toBe(example);
    await user.click(screen.getByRole('button', { name: /Reset source/ }));
    expect(editor.value).toBe(starter);
  });

  it('steps, undoes, edits registers, runs, and resets the actual emulator', async () => {
    const user = await workspace();
    const step = screen.getByRole('button', { name: 'Step', exact: true });
    await user.click(step);
    await user.click(step);
    expect((screen.getByLabelText('D0 decimal value') as HTMLInputElement).value).toBe('42');
    expect(screen.getByRole('status').textContent).toBe('Stopped');
    await user.click(screen.getByRole('button', { name: 'Undo', exact: true }));
    expect((screen.getByLabelText('D0 decimal value') as HTMLInputElement).value).toBe('0');
    fireEvent.change(screen.getByLabelText('D0 decimal value'), { target: { value: '12' } });
    expect(useEmulatorStore.getState().emulatorInstance?.getRegisters()[8]).toBe(12);
    await user.click(screen.getByRole('button', { name: 'Run', exact: true }));
    expect(screen.getByRole('status').textContent).toBe('Running');
    await screen.findByText('Completed');
    expect((screen.getByLabelText('D0 decimal value') as HTMLInputElement).value).toBe('50');
    await user.click(screen.getByRole('button', { name: 'Reset', exact: true }));
    expect(screen.getByRole('status').textContent).toBe('Ready');
    expect((screen.getByLabelText('D0 decimal value') as HTMLInputElement).value).toBe('0');
  });

  it('exports both register and memory data', async () => {
    const user = await workspace();
    const downloads: { name: string; href: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloads.push({ name: this.download, href: this.href });
    });
    await user.click(screen.getByRole('button', { name: /Export/ }));
    await user.click(screen.getByRole('tab', { name: /Memory/ }));
    await user.click(within(screen.getByRole('tabpanel')).getByRole('button', { name: 'Export' }));
    expect(downloads.map((file) => file.name)).toEqual(['registers.txt', 'memory.txt']);
    expect(decodeURIComponent(downloads[0].href)).toContain('d0=00000000');
  });

  it('gives errors precedence over completion and renders their details', () => {
    useEmulatorStore
      .getState()
      .setExecutionState({ ended: true, exception: 'Invalid instruction', errors: ['At line 3'] });
    render(<Output />);
    expect(screen.getByRole('status').textContent).toBe('Error');
    expect(screen.getByText('Invalid instruction')).toBeTruthy();
    expect(screen.getByText('At line 3')).toBeTruthy();
  });
});

it('batches changed values without highlighting initial state, then clears the feedback', () => {
  vi.useFakeTimers();
  const Probe = ({ value }: { value: number }) => {
    const changed = useChangedValues({ d0: value });
    return <span>{changed.has('d0') ? 'changed' : 'steady'}</span>;
  };
  const { rerender } = render(<Probe value={0} />);
  expect(screen.getByText('steady')).toBeTruthy();
  rerender(<Probe value={1} />);
  rerender(<Probe value={2} />);
  act(() => vi.advanceTimersByTime(180));
  expect(screen.getByText('changed')).toBeTruthy();
  act(() => vi.advanceTimersByTime(650));
  expect(screen.getByText('steady')).toBeTruthy();
});
