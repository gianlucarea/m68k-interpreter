import React, { useState } from 'react';
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

const App: React.FC = () => {
  const [showRegisters, setShowRegisters] = useState<boolean>(true);
  const { showFlags } = useEmulatorStore();

  // Set up emulator event listeners
  useEmulatorEvents();

  const toggleRegisters = (): void => {
    setShowRegisters(!showRegisters);
  };

  return (
    <div className="app-container">
      <Navbar onToggleMemory={toggleRegisters} showMemory={showRegisters} />
      <main className="main-content">
        <div className="editor-registers-section">
          <Editor />
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
