import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Output from '../src/components/Output';
import { useEmulatorEvents } from '../src/hooks/useEmulatorEvents';
import { useEmulatorStore } from '../src/stores/emulatorStore';

const Harness = () => {
  useEmulatorEvents();
  return <Output />;
};
const dispatch = (event: string) => act(() => {
  window.dispatchEvent(new Event(`emulator:${event}`));
});
const preview = () => screen.getByText('Next Instruction').nextElementSibling?.textContent;

afterEach(() => {
  cleanup();
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
