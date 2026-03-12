import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import { useEmulatorStore } from '@/stores/emulatorStore';

const Output: React.FC = () => {
  const { executionState } = useEmulatorStore();
  const [delay, setDelay] = React.useState<number>(0);

  return (
    <div className="output-container">
      <div className="output-section">
        <div className="last-instruction">
          <h4>Last Instruction</h4>
          <p>{executionState.lastInstruction}</p>
        </div>

        <div className="delay-control">
          <label htmlFor="delay-input">Delay (ms)</label>
          <div className="input-group">
            <input
              id="delay-input"
              type="number"
              min="0"
              step="100"
              value={delay}
              onChange={(e) => setDelay(parseInt(e.target.value, 10) || 0)}
              placeholder="0"
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

      <div className="execution-status">
        <span className={`status-indicator ${executionState.started ? 'active' : ''}`}>
          {executionState.ended ? '✓ Ended' : executionState.started ? '⏳ Running' : '⏸ Ready'}
        </span>
      </div>
    </div>
  );
};

export default Output;
