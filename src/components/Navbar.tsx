import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faUndo,
  faRedo,
  faStop,
  faLightbulb,
  faQuestionCircle,
  faFlag,
  faMemory,
  faRefresh,
  faMoon,
  faSun,
} from '@fortawesome/free-solid-svg-icons';
import GitHubButton from 'react-github-btn';
import { useEmulatorStore } from '@/stores/emulatorStore';

type AppTheme = 'light' | 'dark';

interface NavbarProps {
  onToggleMemory: () => void;
  showMemory: boolean;
  examples: Array<{ id: string; label: string; content: string }>;
  onSelectExample: (content: string) => void;
  onResetEditor: () => void;
  theme: AppTheme;
  onToggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  onToggleMemory,
  showMemory,
  examples,
  onSelectExample,
  onResetEditor,
  theme,
  onToggleTheme,
}) => {
  const { reset } = useEmulatorStore();
  const [isExampleMenuOpen, setIsExampleMenuOpen] = React.useState<boolean>(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsExampleMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsExampleMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleRun = (): void => {
    // Trigger run in emulator
    window.dispatchEvent(new CustomEvent('emulator:run'));
  };

  const handleStep = (): void => {
    window.dispatchEvent(new CustomEvent('emulator:step'));
  };

  const handleUndo = (): void => {
    window.dispatchEvent(new CustomEvent('emulator:undo'));
  };

  const handleReset = (): void => {
    reset();
    window.dispatchEvent(new CustomEvent('emulator:reset'));
  };

  const handleShowFlags = (): void => {
    window.dispatchEvent(new CustomEvent('emulator:showflags'));
  };

  const handleExampleSelect = (content: string): void => {
    onSelectExample(content);
    setIsExampleMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-commands">
        <button className="btn-command" onClick={handleRun} title="Run program">
          <FontAwesomeIcon icon={faPlay} size="lg" />
        </button>
        <button className="btn-command" onClick={handleReset} title="Reset">
          <FontAwesomeIcon icon={faStop} size="lg" />
        </button>
        <button className="btn-command" onClick={handleStep} title="Step">
          <FontAwesomeIcon icon={faRedo} size="lg" />
        </button>
        <button className="btn-command" onClick={handleUndo} title="Undo">
          <FontAwesomeIcon icon={faUndo} size="lg" />
        </button>
        <button className="btn-command" onClick={onResetEditor} title="Reset editor">
          <FontAwesomeIcon icon={faRefresh} size="lg" />
        </button>
        <div className="examples-menu" ref={menuRef}>
          <button
            className="btn-command examples-toggle"
            onClick={() => setIsExampleMenuOpen((prev) => !prev)}
            title="Load example"
            aria-expanded={isExampleMenuOpen}
            aria-haspopup="menu"
          >
            <FontAwesomeIcon icon={faLightbulb} size="lg" />
          </button>
          {isExampleMenuOpen && (
            <div className="examples-dropdown" role="menu" aria-label="Example list">
              {examples.map((example) => (
                <button
                  key={example.id}
                  className="examples-option"
                  onClick={() => handleExampleSelect(example.content)}
                  role="menuitem"
                >
                  {example.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <h1 className="navbar-title">
        M68K Interpreter
        <div className="navbar-github-btn">
          <GitHubButton
            href="https://github.com/gianlucarea/m68k-interpreter"
            data-color-scheme={
              theme === 'dark'
                ? 'no-preference: dark; light: dark; dark: dark;'
                : 'no-preference: light; light: light; dark: light;'
            }
            data-icon="octicon-star"
            data-size="large"
            data-show-count="true"
            aria-label="Star gianlucarea/m68k-interpreter on GitHub"
          >
            Star
          </GitHubButton>
        </div>
      </h1>

      <div className="navbar-tools">
        <button
          className="btn-tool"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} size="lg" />
        </button>
        <button className="btn-tool" id="showFlag" title="Show flags" onClick={handleShowFlags}>
          <FontAwesomeIcon icon={faFlag} size="lg" />
        </button>
        <button
          className="btn-tool"
          id="toggleMemory"
          title={showMemory ? 'Hide Memory View' : 'Show Memory View'}
          onClick={onToggleMemory}
        >
          <FontAwesomeIcon icon={faMemory} size="lg" />
        </button>
        <a
          href="/help.html"
          target="_blank"
          rel="noreferrer"
          className="btn-tool"
          title="Help"
        >
          <FontAwesomeIcon icon={faQuestionCircle} size="lg" />
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
