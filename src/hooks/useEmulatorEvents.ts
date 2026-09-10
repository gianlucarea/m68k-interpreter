import { useEffect, useRef } from 'react';
import { useEmulatorStore } from '@/stores/emulatorStore';
import { Emulator } from '@/core/emulator';

declare global {
  interface Window {
    editorCode: string;
    emulatorInstance: Emulator | null;
  }
}

export const useEmulatorEvents = () => {
  const {
    reset,
    setRegister,
    setMemory,
    setFlags,
    setExecutionState,
    setEmulatorInstance,
    toggleShowFlags,
  } = useEmulatorStore();
  const emulatorRef = useRef<Emulator | null>(null);
  const executionLoopRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const cancelLoop = (): void => {
      if (executionLoopRef.current) clearTimeout(executionLoopRef.current);
      executionLoopRef.current = null;
    };
    const updateStoreFromEmulator = (emulator: Emulator): void => {
      if (!emulator) return;

      const registers = emulator.getRegisters();
      // Emulator layout: A0-A7 (indices 0-7), D0-D7 (indices 8-15)
      const addressRegNames = ['a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'] as const;
      const dataRegNames = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'] as const;

      // Update address registers (indices 0-7)
      for (let i = 0; i < 8; i++) {
        setRegister(addressRegNames[i], registers[i]);
      }

      // Update data registers (indices 8-15)
      for (let i = 0; i < 8; i++) {
        setRegister(dataRegNames[i], registers[i + 8]);
      }

      // Update program counter
      setRegister('pc', emulator.getPC());

      // Update CCR register value
      setRegister('ccr', emulator.getCCR());

      // Update memory
      const memory = emulator.getMemory();
      setMemory(memory);

      // Update condition flags
      setFlags({
        z: emulator.getZFlag(),
        v: emulator.getVFlag(),
        n: emulator.getNFlag(),
        c: emulator.getCFlag(),
        x: emulator.getXFlag(),
      });

      // Update instruction displays
      setExecutionState({
        lastInstruction: emulator.getLastInstruction(),
        nextInstruction: emulator.getNextInstruction(),
      });

      // Handle errors
      const errors = emulator.getErrors();
      setExecutionState({ errors, exception: emulator.getException() ?? null });
    };
    const handleRun = (): void => {
      cancelLoop();
      setExecutionState({ started: false, ended: false, stopped: false });
      const code = window.editorCode || '';
      if (!code.trim()) {
        setExecutionState({
          nextInstruction: null,
          lastInstruction: 'Error: No code to execute',
          exception: 'No code provided',
        });
        return;
      }

      // Reset errors and exception at the start of a new run
      setExecutionState({ errors: [], exception: null });

      try {
        initializeAndRun(code);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setExecutionState({
          nextInstruction: null,
          lastInstruction: message,
          exception: message,
        });
      }
    };

    const initializeAndRun = (code: string): void => {
      try {
        emulatorRef.current = new Emulator(code);
        setEmulatorInstance(emulatorRef.current);

        if (emulatorRef.current.getException()) {
          setExecutionState({
            nextInstruction: null,
            lastInstruction: emulatorRef.current.getException(),
            exception: emulatorRef.current.getException(),
          });
          return;
        }

        setExecutionState({ started: true, ended: false, stopped: false });
        updateStoreFromEmulator(emulatorRef.current);

        // Run the emulation loop
        const executionLoop = (): void => {
          if (emulatorRef.current) {
            const finished = emulatorRef.current.emulationStep();
            updateStoreFromEmulator(emulatorRef.current);

            if (finished) {
              setExecutionState({
                ended: true,
                started: false,
                stopped: emulatorRef.current.isStopped(),
                nextInstruction: null,
              });
              if (emulatorRef.current.getException()) {
                setExecutionState({ exception: emulatorRef.current.getException() });
              }
              if (executionLoopRef.current) {
                clearTimeout(executionLoopRef.current);
                executionLoopRef.current = null;
              }
            } else {
              // Schedule the next step with user-configured delay (convert seconds to ms, minimum 50ms)
              const executionDelay = Math.max(useEmulatorStore.getState().delay * 1000, 50);
              executionLoopRef.current = setTimeout(executionLoop, executionDelay);
            }
          }
        };

        executionLoop();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error during emulation';
        setExecutionState({
          nextInstruction: null,
          lastInstruction: message,
          exception: message,
        });
      }
    };

    const handleStep = (): void => {
      cancelLoop();
      if (!emulatorRef.current) {
        // Try to initialize if not already initialized
        const code = window.editorCode || '';
        if (!code.trim()) {
          setExecutionState({
            nextInstruction: null,
            lastInstruction: 'Error: No code to step through',
            exception: 'No code provided',
          });
          return;
        }

        try {
          emulatorRef.current = new Emulator(code);
          setEmulatorInstance(emulatorRef.current);
          if (emulatorRef.current.getException()) {
            setExecutionState({
              nextInstruction: null,
              lastInstruction: emulatorRef.current.getException(),
              exception: emulatorRef.current.getException(),
            });
            return;
          }
          setExecutionState({ started: true, ended: false, stopped: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create emulator';
          setExecutionState({
            nextInstruction: null,
            lastInstruction: `Error: ${message}`,
            exception: message,
          });
          return;
        }
      }

      const finished = emulatorRef.current.emulationStep();
      updateStoreFromEmulator(emulatorRef.current);
      setExecutionState({
        started: !finished,
        ended: finished,
        stopped: !finished || emulatorRef.current.isStopped(),
      });

      if (finished) {
        setExecutionState({ ended: true, nextInstruction: null });
        if (emulatorRef.current.getException()) {
          setExecutionState({ exception: emulatorRef.current.getException() });
        }
      }
    };

    const handleUndo = (): void => {
      cancelLoop();
      if (emulatorRef.current) {
        emulatorRef.current.undoFromStack();
        updateStoreFromEmulator(emulatorRef.current);
        setExecutionState({ started: true, ended: false, stopped: true });
      }
    };

    const handleReset = (): void => {
      // Clear any running execution loop
      if (executionLoopRef.current) {
        clearTimeout(executionLoopRef.current);
        executionLoopRef.current = null;
      }

      reset();
      emulatorRef.current = null;
      setEmulatorInstance(null);
      setExecutionState({
        started: false,
        ended: false,
        stopped: false,
        nextInstruction: null,
        lastInstruction: 'Ready',
        exception: null,
        errors: [],
        currentLine: 0,
      });
    };

    const handleShowFlags = (): void => {
      toggleShowFlags();
    };

    window.addEventListener('emulator:run', handleRun);
    window.addEventListener('emulator:step', handleStep);
    window.addEventListener('emulator:undo', handleUndo);
    window.addEventListener('emulator:reset', handleReset);
    window.addEventListener('emulator:showflags', handleShowFlags);

    return () => {
      window.removeEventListener('emulator:run', handleRun);
      window.removeEventListener('emulator:step', handleStep);
      window.removeEventListener('emulator:undo', handleUndo);
      window.removeEventListener('emulator:reset', handleReset);
      window.removeEventListener('emulator:showflags', handleShowFlags);

      // Cleanup any pending execution
      if (executionLoopRef.current) {
        clearTimeout(executionLoopRef.current);
      }
    };
  }, [
    reset,
    setRegister,
    setMemory,
    setFlags,
    setExecutionState,
    setEmulatorInstance,
    toggleShowFlags,
  ]);
};
