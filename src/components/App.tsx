import React, { Suspense, useMemo, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './Navbar';
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

  const Editor = React.lazy(async () => import('./Editor'));

type AppTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'm68k-theme';

const getInitialTheme = (): AppTheme => {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === 'dark' ? 'dark' : 'light';
};

const App: React.FC = () => {
  const [showRegisters, setShowRegisters] = useState<boolean>(true);
  const [editorCode, setEditorCode] = useState<string>(INITIAL_EDITOR_CODE);
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);
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

  const toggleTheme = (): void => {
    setTheme((previousTheme) => (previousTheme === 'dark' ? 'light' : 'dark'));
  };

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <div className="app-container">
      <Navbar
        onToggleMemory={toggleRegisters}
        showMemory={showRegisters}
        examples={examples}
        onSelectExample={handleExampleSelect}
        onResetEditor={handleResetEditor}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="main-content">
        <div className="editor-registers-section">
          <Suspense fallback={<div className="editor-loading">Loading editor...</div>}>
            <Editor code={editorCode} onCodeChange={setEditorCode} theme={theme} />
          </Suspense>
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
