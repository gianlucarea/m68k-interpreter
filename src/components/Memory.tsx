import React, { useState } from 'react';
import { useEmulatorStore } from '@/stores/emulatorStore';

const Memory: React.FC = () => {
  const { memory } = useEmulatorStore();
  const [startAddress, setStartAddress] = useState<number>(0x1000);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(e.target.value, 16);
    if (!isNaN(value)) {
      setStartAddress(value);
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
      <h3 className="memory-title">Memory View</h3>

      <div className="memory-controls">
        <label htmlFor="mem-start">Start Address</label>
        <input
          id="mem-start"
          type="text"
          value={`0x${startAddress.toString(16).padStart(8, '0')}`}
          onChange={handleAddressChange}
          placeholder="0x00000000"
        />
        <button onClick={handleDownload} className="btn-download">
          Download
        </button>
      </div>

      <div className="memory-table-wrapper">
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
                  <td className="addr-cell">
                    {`0x${rowStart.toString(16).padStart(8, '0')}`}
                  </td>
                  {Array.from({ length: 16 }).map((_, col) => {
                    const addr = rowStart + col;
                    return (
                      <td key={col} className="mem-cell">
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
