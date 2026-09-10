import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faArrowRotateLeft,
  faForwardStep,
  faRotate,
  faMoon,
  faSun,
  faChevronDown,
  faCode,
  faArrowUpRightFromSquare,
  faBookOpen,
} from '@fortawesome/free-solid-svg-icons';

interface NavbarProps {
  examples: Array<{ id: string; label: string; content: string }>;
  onSelectExample: (content: string, name: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ examples, onSelectExample, theme, onToggleTheme }) => {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  React.useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [open]);
  const dispatch = (action: string) => window.dispatchEvent(new CustomEvent(`emulator:${action}`));
  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <header className="navbar">
      <a className="brand" href="./" aria-label="M68K Interpreter home">
        <span className="brand-mark">
          <FontAwesomeIcon icon={faCode} />
        </span>
        <div>
          <h1>
            M68K<span className="brand-divider">/</span>
            <span className="brand-product">INTERPRETER</span>
          </h1>
          <span className="brand-caption">A playground for the machine.</span>
        </div>
      </a>
      <nav className="navbar-tools" aria-label="Resources">
        <a
          className="btn-tool"
          href="./help.html"
          target="_blank"
          rel="noreferrer"
          aria-label="Documentation"
          title="Documentation"
        >
          <FontAwesomeIcon icon={faBookOpen} /> <span>Docs</span>
        </a>
        <a
          className="btn-tool github-link"
          href="https://github.com/gianlucarea/m68k-interpreter"
          target="_blank"
          rel="noreferrer"
        >
          GitHub <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
        </a>
        <span className="toolbar-divider" />
        <button
          className="btn-tool icon-button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
        </button>
      </nav>
      <div className="workspace-toolbar">
        <nav className="navbar-commands" aria-label="Execution controls">
          <button
            className="btn-command run-button"
            onClick={() => dispatch('run')}
            title="Run program"
          >
            <FontAwesomeIcon icon={faPlay} /> Run
          </button>
          <button
            className="btn-command"
            onClick={() => dispatch('step')}
            title="Step one instruction"
          >
            <FontAwesomeIcon icon={faForwardStep} /> Step
          </button>
          <button className="btn-command" onClick={() => dispatch('undo')} title="Undo instruction">
            <FontAwesomeIcon icon={faArrowRotateLeft} /> Undo
          </button>
          <span className="toolbar-divider" />
          <button className="btn-command" onClick={() => dispatch('reset')} title="Reset emulator">
            <FontAwesomeIcon icon={faRotate} /> Reset
          </button>
        </nav>
        <div
          className="examples-menu"
          ref={menuRef}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeMenu();
            }
            if (!open && event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
            } else if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault();
              const items = Array.from(
                menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
              );
              const index = items.indexOf(document.activeElement as HTMLButtonElement);
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? items.length - 1
                    : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
              items[next]?.focus();
            }
          }}
        >
          <button
            ref={triggerRef}
            className="btn-command examples-toggle"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls="examples-list"
          >
            <FontAwesomeIcon icon={faCode} /> Examples{' '}
            <FontAwesomeIcon icon={faChevronDown} className={open ? 'chevron open' : 'chevron'} />
          </button>
          {open && (
            <div
              id="examples-list"
              className="examples-dropdown"
              role="menu"
              aria-label="Example list"
            >
              <div className="menu-caption" role="presentation">
                LOAD A PROGRAM
              </div>
              {examples.map((example) => (
                <button
                  role="menuitem"
                  key={example.id}
                  className="examples-option"
                  onClick={() => {
                    onSelectExample(example.content, example.id);
                    closeMenu();
                  }}
                >
                  <span>{example.label}</span>
                  <span className="file-extension">.asm</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
export default Navbar;
