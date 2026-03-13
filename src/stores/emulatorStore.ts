/**
 * Zustand store for emulator state management
 */

import { create } from 'zustand';
import type { Registers, ConditionFlags, MemoryCell, ExecutionState } from '@/types/emulator';
import type { Emulator } from '@/core/emulator';

interface EmulatorStore {
  // State
  registers: Registers;
  memory: MemoryCell;
  flags: ConditionFlags;
  executionState: ExecutionState;
  emulatorInstance: Emulator | null;
  showFlags: boolean;
  delay: number;
  history: Array<{
    registers: Registers;
    memory: MemoryCell;
    flags: ConditionFlags;
    pc: number;
  }>;

  // Actions
  setRegisters: (registers: Partial<Registers>) => void;
  setMemory: (memory: MemoryCell) => void;
  setFlags: (flags: Partial<ConditionFlags>) => void;
  setExecutionState: (state: Partial<ExecutionState>) => void;
  setEmulatorInstance: (emulator: Emulator | null) => void;
  toggleShowFlags: () => void;
  setDelay: (delay: number) => void;
  pushHistory: () => void;
  popHistory: () => void;
  reset: () => void;

  // Getters
  getRegister: (name: keyof Registers) => number;
  setRegister: (name: keyof Registers, value: number) => void;
  setRegisterInEmulator: (name: keyof Registers, value: number) => void;
}

const initialRegisters: Registers = {
  d0: 0,
  d1: 0,
  d2: 0,
  d3: 0,
  d4: 0,
  d5: 0,
  d6: 0,
  d7: 0,
  a0: 0,
  a1: 0,
  a2: 0,
  a3: 0,
  a4: 0,
  a5: 0,
  a6: 0,
  a7: 0,
  pc: 0x01000,
  ccr: 0,
};

const initialFlags: ConditionFlags = {
  z: 0,
  v: 0,
  n: 0,
  c: 0,
  x: 0,
};

const initialExecutionState: ExecutionState = {
  started: false,
  ended: false,
  stopped: false,
  lastInstruction: 'Ready',
  exception: null,
  errors: [],
  currentLine: 0,
};

export const useEmulatorStore = create<EmulatorStore>((set, get) => ({
  // Initial state
  registers: initialRegisters,
  memory: {},
  flags: initialFlags,
  executionState: initialExecutionState,
  emulatorInstance: null,
  showFlags: false,
  delay: 0,
  history: [],

  // Actions
  setRegisters: (newRegisters) =>
    set((state) => ({
      registers: { ...state.registers, ...newRegisters },
    })),

  setMemory: (newMemory) =>
    set(() => ({
      memory: newMemory,
    })),

  setFlags: (newFlags) =>
    set((state) => ({
      flags: { ...state.flags, ...newFlags },
    })),

  setExecutionState: (newState) =>
    set((state) => ({
      executionState: { ...state.executionState, ...newState },
    })),

  setEmulatorInstance: (emulator) =>
    set(() => ({
      emulatorInstance: emulator,
    })),

  toggleShowFlags: () =>
    set((state) => ({
      showFlags: !state.showFlags,
    })),

  setDelay: (newDelay: number) =>
    set(() => ({
      delay: newDelay,
    })),

  pushHistory: () =>
    set((state) => ({
      history: [
        ...state.history,
        {
          registers: { ...state.registers },
          memory: { ...state.memory },
          flags: { ...state.flags },
          pc: state.registers.pc,
        },
      ],
    })),

  popHistory: () =>
    set((state) => {
      if (state.history.length === 0) return state;
      const newHistory = [...state.history];
      const lastState = newHistory.pop();
      if (!lastState) return state;
      return {
        history: newHistory,
        registers: { ...lastState.registers },
        memory: { ...lastState.memory },
        flags: { ...lastState.flags },
      };
    }),

  reset: () =>
    set(() => ({
      registers: initialRegisters,
      memory: {},
      flags: initialFlags,
      executionState: initialExecutionState,
      emulatorInstance: null,
      showFlags: false,
      delay: 0,
      history: [],
    })),

  getRegister: (name: keyof Registers) => {
    const state = get();
    return state.registers[name];
  },

  setRegister: (name: keyof Registers, value: number) => {
    set((state) => ({
      registers: {
        ...state.registers,
        [name]: value,
      },
    }));
  },

  setRegisterInEmulator: (name: keyof Registers, value: number) => {
    const state = get();
    const emulator = state.emulatorInstance;

    // Register name to index mapping
    const registerMap: Record<string, number> = {
      d0: 8, d1: 9, d2: 10, d3: 11, d4: 12, d5: 13, d6: 14, d7: 15,
      a0: 0, a1: 1, a2: 2, a3: 3, a4: 4, a5: 5, a6: 6, a7: 7,
    };

    if (emulator && name in registerMap) {
      const registers = emulator.getRegisters();
      registers[registerMap[name]] = value;
    }

    // Also update the store
    set((state) => ({
      registers: {
        ...state.registers,
        [name]: value,
      },
    }));
  },
}));
