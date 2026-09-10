import React, { useState } from 'react';
import { useChangedValues } from '@/hooks/useChangedValues';
import { useEmulatorStore } from '@/stores/emulatorStore';

const Memory: React.FC = () => {
  const { memory } = useEmulatorStore();
  const [startAddress, setStartAddress] = useState<number>(0x1000);

  const [addressInput, setAddressInput] = useState('0x00001000');
  const validAddress =
    /^(0x)?[0-9a-f]+$/i.test(addressInput) && parseInt(addressInput, 16) <= 0x7fffff00;

  const visibleMemory = Object.fromEntries(
    Array.from({ length: 256 }, (_, i) => [startAddress + i, memory[startAddress + i] ?? 0])
  );
  const changed = useChangedValues(visibleMemory);

  const commitAddress = (): void => {
    if (validAddress) {
      const value = parseInt(addressInput, 16);
      setStartAddress(value);
      setAddressInput(`0x${value.toString(16).padStart(8, '0')}`);
    }
  };

  const handleDownload = (): void => {
    const memoryData = Object.entries(memory)
      .map(([addr, val]) => `${addr}=${val.toString(16).padStart(2, '0')}`)
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(memoryData)}`);
    element.setAttribute('download', 'memory.txt');
    element.style.display = 'none';

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getValue = (addr: number): string => {
    const value = memory[addr];
    return value !== undefined ? value.toString(16).padStart(2, '0') : '00';
  };

  return (
    <div className="memory-container">
      <div className="registers-header">
        <div>
          <h3>Memory view</h3>
          <p className="panel-description">Inspect the bytes behind your program.</p>
        </div>
        <span className="small-badge">256 BYTES</span>
      </div>

      <div className="memory-controls">
        <label htmlFor="mem-start">Start Address</label>
        <input
          id="mem-start"
          type="text"
          value={addressInput}
          onChange={(event) => setAddressInput(event.target.value)}
          onBlur={commitAddress}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitAddress();
          }}
          aria-invalid={!validAddress}
          aria-describedby={!validAddress ? 'address-error' : undefined}
          placeholder="0x00000000"
        />
        <button onClick={handleDownload} className="btn-download">
          Export
        </button>
      </div>

      {!validAddress && (
        <p className="address-error" id="address-error">
          Enter a hexadecimal address from 0x0 to 0x7FFFFF00.
        </p>
      )}
      <div className="memory-table-wrapper" tabIndex={0} role="region" aria-label="Memory bytes">
        <table className="memory-table">
          <thead>
            <tr>
              <th>Address</th>
              {Array.from({ length: 16 }).map((_, i) => (
                <th key={i}>+{i.toString(16).toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 16 }).map((_, row) => {
              const rowStart = startAddress + row * 16;
              return (
                <tr key={row}>
                  <td className="addr-cell">{`0x${rowStart.toString(16).padStart(8, '0')}`}</td>
                  {Array.from({ length: 16 }).map((_, col) => {
                    const addr = rowStart + col;
                    return (
                      <td
                        key={col}
                        className={`mem-cell ${changed.has(String(addr)) ? 'value-changed' : ''}`}
                        title={`Address 0x${addr.toString(16)}`}
                      >
                        {getValue(addr)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="memory-stats">
        <p>Used bytes: {Object.keys(memory).length}</p>
        <p>Address range: 0x00000000 - 0x7FFFFFFF</p>
      </div>
    </div>
  );
};

export default Memory;
