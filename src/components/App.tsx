import React, { useMemo, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './Navbar';
import Editor from './Editor';
import Registers from './Registers';
import Output from './Output';
import Memory from './Memory';
import Flags from './Flags';
import { useEmulatorEvents } from '@/hooks/useEmulatorEvents';
import { useEmulatorStore } from '@/stores/emulatorStore';
import '../styles/main.css';

interface ExampleOption {
  id: string;
  label: string;
  content: string;
}

const INITIAL_EDITOR_CODE = `ORG $1000
  * Write your M68K assembly code here
  * Your code goes here
END`;

const formatExampleLabel = (fileName: string): string =>
  fileName
    .replace('.asm', '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const App: React.FC = () => {
  const [showRegisters, setShowRegisters] = useState<boolean>(true);
  const [editorCode, setEditorCode] = useState<string>(INITIAL_EDITOR_CODE);
  const { showFlags } = useEmulatorStore();

  const examples = useMemo<ExampleOption[]>(() => {
    const modules = import.meta.glob('../../examples/*.asm', {
      eager: true,
      import: 'default',
      query: '?raw',
    }) as Record<string, string>;

    return Object.entries(modules)
      .map(([path, content]) => {
        const fileName = path.split('/').pop() ?? path;
        return {
          id: fileName,
          label: formatExampleLabel(fileName),
          content,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Set up emulator event listeners
  useEmulatorEvents();

  const toggleRegisters = (): void => {
    setShowRegisters(!showRegisters);
  };

  const handleExampleSelect = (content: string): void => {
    setEditorCode(content);
  };

  const handleResetEditor = (): void => {
    setEditorCode(INITIAL_EDITOR_CODE);
  };

  return (
    <div className="app-container">
      <Navbar
        onToggleMemory={toggleRegisters}
        showMemory={showRegisters}
        examples={examples}
        onSelectExample={handleExampleSelect}
        onResetEditor={handleResetEditor}
      />
      <main className="main-content">
        <div className="editor-registers-section">
          <Editor code={editorCode} onCodeChange={setEditorCode} />
          <Output />
        </div>
        <div className="output-memory-section">
          {showFlags ? <Flags /> : showRegisters ? <Registers /> : <Memory />}
        </div>
      </main>
      <Analytics />
    </div>
  );
};

export default App;
