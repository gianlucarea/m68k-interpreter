import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import { useEmulatorStore } from '@/stores/emulatorStore';

const Output: React.FC = () => {
  const { executionState, delay, setDelay } = useEmulatorStore();

  const status =
    executionState.exception || executionState.errors.length
      ? 'Error'
      : executionState.stopped
        ? 'Stopped'
        : executionState.ended
          ? 'Completed'
          : executionState.started
            ? 'Running'
            : 'Ready';

  return (
    <section className="output-container" aria-label="Execution console">
      <div className="console-heading">
        <h3>
          <span className="console-prompt">›_</span> Execution console
        </h3>
        <span role="status" className={`status-indicator status-${status.toLowerCase()}`}>
          <span className="signal-dot" />
          {status}
        </span>
      </div>
      <div className="output-section">
        <div className="instruction-box">
          <h4>Last Instruction</h4>
          <p>{executionState.lastInstruction}</p>
        </div>

        <div className="instruction-box">
          <h4>Next Instruction</h4>
          <p>{executionState.nextInstruction ?? '—'}</p>
        </div>

        <div className="delay-control">
          <label htmlFor="delay-input">Delay (s)</label>
          <div className="input-group">
            <input
              id="delay-input"
              type="number"
              min="0"
              step="0.5"
              value={delay}
              onChange={(e) => setDelay(parseFloat(e.target.value) || 0)}
              placeholder="0"
              title="Delay between instruction execution in seconds"
            />
            <FontAwesomeIcon icon={faClock} title="Execution delay" />
          </div>
        </div>
      </div>

      {executionState.errors.length > 0 && (
        <div className="errors-section">
          <h4>Errors</h4>
          <ul className="error-list">
            {executionState.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {executionState.exception && (
        <div className="exception-section">
          <h4>Exception</h4>
          <p className="exception-text">{executionState.exception}</p>
        </div>
      )}

      {!executionState.started && !executionState.ended && status === 'Ready' && (
        <p className="console-hint">
          <span>↳</span> Ready when you are. Run your program or step through one instruction at a
          time.
        </p>
      )}
    </section>
  );
};

export default Output;
