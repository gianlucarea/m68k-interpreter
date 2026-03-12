import React from 'react';
import { useEmulatorStore } from '@/stores/emulatorStore';

const Flags: React.FC = () => {
  const { flags, registers } = useEmulatorStore();

  return (
    <div className="flags-container">
      <div className="registers-header">
        <h3>CPU Flags</h3>
      </div>

      <div className="registers-content">
        <table className="registers-table">
          <thead>
            <tr>
              <th colSpan={2}>Condition Code Register (CCR)</th>
            </tr>
            <tr>
              <th>Flag</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className={flags.z ? 'flag-set' : 'flag-clear'}>
              <td className="flag-name">Z (Zero)</td>
              <td className="flag-value">{flags.z ? '1 - SET' : '0 - CLEAR'}</td>
            </tr>
            <tr className={flags.n ? 'flag-set' : 'flag-clear'}>
              <td className="flag-name">N (Negative)</td>
              <td className="flag-value">{flags.n ? '1 - SET' : '0 - CLEAR'}</td>
            </tr>
            <tr className={flags.v ? 'flag-set' : 'flag-clear'}>
              <td className="flag-name">V (Overflow)</td>
              <td className="flag-value">{flags.v ? '1 - SET' : '0 - CLEAR'}</td>
            </tr>
            <tr className={flags.c ? 'flag-set' : 'flag-clear'}>
              <td className="flag-name">C (Carry)</td>
              <td className="flag-value">{flags.c ? '1 - SET' : '0 - CLEAR'}</td>
            </tr>
            <tr className={flags.x ? 'flag-set' : 'flag-clear'}>
              <td className="flag-name">X (Extend)</td>
              <td className="flag-value">{flags.x ? '1 - SET' : '0 - CLEAR'}</td>
            </tr>
          </tbody>
        </table>

        <div className="ccr-hex">
          <strong>CCR Value:</strong> {`0x${registers.ccr.toString(16).padStart(2, '0')}`}
        </div>
      </div>
    </div>
  );
};

export default Flags;
