import React from 'react';
import Registers from './Registers';
import Memory from './Memory';
import Flags from './Flags';
import { useEmulatorStore } from '@/stores/emulatorStore';

const tabs = ['Registers', 'Memory', 'Flags'] as const;
export default function Inspector() {
  const [active, setActive] = React.useState<(typeof tabs)[number]>('Registers');
  const showFlags = useEmulatorStore((state) => state.showFlags);
  React.useEffect(() => {
    setActive(showFlags ? 'Flags' : 'Registers');
  }, [showFlags]);
  return (
    <aside className="inspector" aria-label="CPU inspector">
      <div className="panel-heading">
        <span className="eyebrow">02 / INSPECTOR</span>
        <span className="panel-meta">MOTOROLA 68000</span>
      </div>
      <div className="inspector-tabs" role="tablist" aria-label="CPU views">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            id={`tab-${tab}`}
            role="tab"
            aria-selected={active === tab}
            aria-controls={`panel-${tab}`}
            tabIndex={active === tab ? 0 : -1}
            onClick={() => setActive(tab)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? 2
                    : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
              setActive(tabs[next]);
              document.getElementById(`tab-${tabs[next]}`)?.focus();
            }}
          >
            {tab}
            <span className="tab-number">0{index + 1}</span>
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab}
          id={`panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          hidden={active !== tab}
          tabIndex={0}
          className="inspector-panel"
        >
          {tab === 'Registers' ? <Registers /> : tab === 'Memory' ? <Memory /> : <Flags />}
        </div>
      ))}
      <div className="inspector-footer">
        <span className="signal-dot" /> Live CPU state<span>HEX + DEC</span>
      </div>
    </aside>
  );
}
