import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faUndo,
  faRedo,
  faStop,
  faQuestionCircle,
  faFlag,
  faMemory,
} from '@fortawesome/free-solid-svg-icons';
import { useEmulatorStore } from '@/stores/emulatorStore';

interface NavbarProps {
  onToggleMemory: () => void;
  showMemory: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onToggleMemory, showMemory }) => {
  const { reset } = useEmulatorStore();

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
      </div>

      <h1 className="navbar-title">M68K Interpreter</h1>

      <div className="navbar-tools">
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
