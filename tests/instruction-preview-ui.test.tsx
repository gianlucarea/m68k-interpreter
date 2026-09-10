import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Output from '../src/components/Output';
import { useEmulatorEvents } from '../src/hooks/useEmulatorEvents';
import { useEmulatorStore } from '../src/stores/emulatorStore';

const Harness = () => {
  useEmulatorEvents();
  return <Output />;
};
const dispatch = (event: string) =>
  act(() => {
    window.dispatchEvent(new Event(`emulator:${event}`));
  });
const preview = () => screen.getByText('Next Instruction').nextElementSibling?.textContent;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  useEmulatorStore.getState().reset();
});

describe('Instruction preview display', () => {
  it('updates during stepping and undo, and clears on completion and reset', () => {
    window.editorCode = 'ORG $1000\nMOVE.L #1, D0\nNOP\nEND';
    render(<Harness />);
    expect(preview()).toBe('—');
    dispatch('step');
    expect(preview()).toBe('MOVE.L #1, D0');
    dispatch('step');
    expect(preview()).toBe('NOP');
    dispatch('undo');
    expect(preview()).toBe('MOVE.L #1, D0');
    dispatch('step');
    dispatch('step');
    dispatch('step');
    dispatch('step');
    expect(preview()).toBe('—');
    dispatch('reset');
    expect(preview()).toBe('—');
  });

  it('clears the preview when running invalid source', () => {
    window.editorCode = 'ORG $1000\nNOP\nEND';
    render(<Harness />);
    dispatch('step');
    expect(preview()).toBe('NOP');
    window.editorCode = 'NOP';
    dispatch('run');
    expect(preview()).toBe('—');
  });

  it('clears the preview when execution halts at an ORG boundary', () => {
    window.editorCode = 'ORG $1000\nNOP\nORG $2000\nMOVE.L #2, D0\nEND';
    render(<Harness />);
    dispatch('step');
    dispatch('step');
    dispatch('step');
    expect(preview()).toBe('—');
  });
});

describe('Execution console status and timing', () => {
  it('keeps only one run loop and pauses automatic execution when stepping', () => {
    vi.useFakeTimers();
    window.editorCode = 'ORG $1000\nADDQ.L #1, D0\nADDQ.L #1, D0\nEND';
    render(<Harness />);
    dispatch('run');
    dispatch('run');
    act(() => vi.advanceTimersByTime(50));
    expect(useEmulatorStore.getState().registers.d0).toBe(1);
    dispatch('step');
    expect(useEmulatorStore.getState().registers.d0).toBe(2);
    expect(screen.getByRole('status').textContent).toBe('Stopped');
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('status').textContent).toBe('Stopped');
    expect(useEmulatorStore.getState().registers.d0).toBe(2);
  });

  it('applies delay changes without cancelling an active run', () => {
    vi.useFakeTimers();
    window.editorCode = 'ORG $1000\nADDQ.L #1, D0\nADDQ.L #1, D0\nEND';
    render(<Harness />);
    dispatch('run');
    act(() => useEmulatorStore.getState().setDelay(1));
    act(() => vi.advanceTimersByTime(50));
    expect(useEmulatorStore.getState().registers.d0).toBe(1);
    act(() => vi.advanceTimersByTime(999));
    expect(useEmulatorStore.getState().registers.d0).toBe(1);
    act(() => vi.advanceTimersByTime(1));
    expect(useEmulatorStore.getState().registers.d0).toBe(2);
  });

  it('distinguishes a CPU halt from normal completion', () => {
    window.editorCode = 'ORG $1000\nSTOP #$2700\nEND';
    render(<Harness />);
    dispatch('step');
    dispatch('step');
    expect(screen.getByRole('status').textContent).toBe('Stopped');
    expect(preview()).toBe('—');
    dispatch('reset');
    expect(screen.getByRole('status').textContent).toBe('Ready');
  });
});
