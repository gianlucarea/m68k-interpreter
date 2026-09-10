import React, { Suspense, useMemo, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './Navbar';
import Inspector from './Inspector';
import Output from './Output';
import { useEmulatorEvents } from '@/hooks/useEmulatorEvents';
import '../styles/main.css';

interface ExampleOption {
  id: string;
  label: string;
  content: string;
}

const INITIAL_EDITOR_CODE = `ORG $1000
  * Your next idea starts here.
  * Load an example or write M68K assembly.

  MOVEQ #42, D0
  MOVEQ #8, D1
  ADD.L D1, D0

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
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

const App: React.FC = () => {
  const [fileName, setFileName] = useState('main.asm');
  const [editorCode, setEditorCode] = useState<string>(INITIAL_EDITOR_CODE);
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);

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

  const handleExampleSelect = (content: string, name: string): void => {
    window.dispatchEvent(new CustomEvent('emulator:reset'));
    setFileName(name);
    setEditorCode(content);
  };

  const handleResetEditor = (): void => {
    window.dispatchEvent(new CustomEvent('emulator:reset'));
    setEditorCode(INITIAL_EDITOR_CODE);
    setFileName('main.asm');
  };

  const toggleTheme = (): void => {
    setTheme((previousTheme) => (previousTheme === 'dark' ? 'light' : 'dark'));
  };

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* Theme still works when storage is unavailable. */
    }
  }, [theme]);

  return (
    <div className="app-container">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <Navbar
        examples={examples}
        onSelectExample={handleExampleSelect}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">THE 68K WORKSPACE</span>
          <h2>
            Think in code. <span>See the machine.</span>
          </h2>
        </div>
        <span className="architecture-badge">
          <span className="signal-dot" /> IN-BROWSER EMULATION
        </span>
      </div>
      <main className="main-content" id="workspace" tabIndex={-1}>
        <div className="editor-registers-section">
          <Suspense fallback={<div className="editor-loading">Loading editor...</div>}>
            <Editor
              code={editorCode}
              onCodeChange={setEditorCode}
              theme={theme}
              fileName={fileName}
              onResetEditor={handleResetEditor}
            />
          </Suspense>
          <Output />
        </div>
        <Inspector />
      </main>
      <footer className="app-footer">
        <span>
          <span className="footer-symbol">⌘</span> Built for curious minds.
        </span>
        <span>
          M68K ASSEMBLY <span className="footer-separator">/</span> LOCAL EXECUTION
        </span>
      </footer>
      <Analytics />
    </div>
  );
};

export default App;
