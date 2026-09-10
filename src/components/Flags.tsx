import { useEmulatorStore } from '@/stores/emulatorStore';
import { useChangedValues } from '@/hooks/useChangedValues';

const descriptions = [
  { key: 'x', name: 'Extend', description: 'Carry for multi-precision operations.' },
  { key: 'n', name: 'Negative', description: 'The result has its sign bit set.' },
  { key: 'z', name: 'Zero', description: 'The result equals zero.' },
  { key: 'v', name: 'Overflow', description: 'The signed result exceeds its range.' },
  { key: 'c', name: 'Carry', description: 'An unsigned carry or borrow occurred.' },
] as const;
export default function Flags() {
  const { flags, registers } = useEmulatorStore();
  const changed = useChangedValues({ ...flags });
  return (
    <div className="flags-container">
      <div className="registers-header">
        <div>
          <h3>Condition codes</h3>
          <p className="panel-description">Five bits. The outcome of every operation.</p>
        </div>
        <span className="small-badge">CCR</span>
      </div>
      <div className="flag-bits" aria-label="Condition code bits">
        {descriptions.map(({ key }) => (
          <div
            key={key}
            className={`flag-bit ${flags[key] ? 'is-set' : ''} ${changed.has(key) ? 'value-changed' : ''}`}
          >
            <span>{key.toUpperCase()}</span>
            <strong>{flags[key]}</strong>
          </div>
        ))}
      </div>
      <div className="flag-details">
        {descriptions.map(({ key, name, description }) => (
          <div className="flag-detail" key={key}>
            <span className={`flag-letter ${flags[key] ? 'is-set' : ''}`}>{key.toUpperCase()}</span>
            <div>
              <h4>{name}</h4>
              <p>{description}</p>
            </div>
            <span className={`flag-state ${flags[key] ? 'is-set' : ''}`}>
              {flags[key] ? 'SET' : 'CLEAR'}
            </span>
          </div>
        ))}
      </div>
      <div className="ccr-hex">
        <span>CONDITION CODE REGISTER</span>
        <strong>0x{registers.ccr.toString(16).padStart(2, '0').toUpperCase()}</strong>
      </div>
    </div>
  );
}
