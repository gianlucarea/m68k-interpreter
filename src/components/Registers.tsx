import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileDownload } from '@fortawesome/free-solid-svg-icons';
import { useChangedValues } from '@/hooks/useChangedValues';
import { useEmulatorStore } from '@/stores/emulatorStore';

const Registers: React.FC = () => {
  const { registers, setRegisterInEmulator } = useEmulatorStore();

  const changed = useChangedValues({ ...registers });

  const formatHex = (value: number, width: number): string =>
    `0x${(value >>> 0).toString(16).padStart(width, '0')}`;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    registerName: string
  ): void => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setRegisterInEmulator(registerName as never, value);
    }
  };

  const handleDownload = (): void => {
    const registerData = Object.entries(registers)
      .map(([name, value]) => `${name}=${(value >>> 0).toString(16).padStart(8, '0')}`)
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute(
      'href',
      `data:text/plain;charset=utf-8,${encodeURIComponent(registerData)}`
    );
    element.setAttribute('download', 'registers.txt');
    element.style.display = 'none';

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const dataRegisters = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'];
  const addressRegisters = ['a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'];

  return (
    <div className="registers-container">
      <div className="registers-header">
        <div>
          <h3>Register set</h3>
          <p className="panel-description">The machine, at a glance.</p>
        </div>
        <button className="btn-download" onClick={handleDownload} title="Download registers">
          <FontAwesomeIcon icon={faFileDownload} /> <span>Export</span>
        </button>
      </div>

      <div className="registers-content">
        {/* Data and Address Registers - Side by Side */}
        <div className="registers-row">
          <table className="registers-table">
            <colgroup>
              <col className="register-name-column" />
              <col />
              <col className="register-hex-column" />
            </colgroup>
            <thead>
              <tr>
                <th colSpan={3}>Data registers</th>
              </tr>
              <tr>
                <th aria-label="Register">Reg</th>
                <th>Decimal</th>
                <th>Hex</th>
              </tr>
            </thead>
            <tbody>
              {dataRegisters.map((regName) => {
                const value = registers[regName as keyof typeof registers] ?? 0;
                return (
                  <tr key={regName} className={changed.has(regName) ? 'value-changed' : ''}>
                    <td className="reg-name">{regName.toUpperCase()}</td>
                    <td>
                      <input
                        type="number"
                        aria-label={`${regName.toUpperCase()} decimal value`}
                        value={value}
                        onChange={(e) => handleInputChange(e, regName)}
                      />
                    </td>
                    <td>{formatHex(value, 8)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <table className="registers-table">
            <colgroup>
              <col className="register-name-column" />
              <col />
              <col className="register-hex-column" />
            </colgroup>
            <thead>
              <tr>
                <th colSpan={3}>Address registers</th>
              </tr>
              <tr>
                <th aria-label="Register">Reg</th>
                <th>Decimal</th>
                <th>Hex</th>
              </tr>
            </thead>
            <tbody>
              {addressRegisters.map((regName) => {
                const value = registers[regName as keyof typeof registers] ?? 0;
                return (
                  <tr key={regName} className={changed.has(regName) ? 'value-changed' : ''}>
                    <td className="reg-name">{regName.toUpperCase()}</td>
                    <td>
                      <input
                        type="number"
                        aria-label={`${regName.toUpperCase()} decimal value`}
                        value={value}
                        onChange={(e) => handleInputChange(e, regName)}
                      />
                    </td>
                    <td>{formatHex(value, 8)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Control Registers */}
        <table className="registers-table">
          <colgroup>
            <col className="register-name-column" />
            <col />
            <col className="register-hex-column" />
          </colgroup>
          <thead>
            <tr>
              <th colSpan={3}>Control Registers</th>
            </tr>
            <tr>
              <th aria-label="Register">Reg</th>
              <th>Decimal</th>
              <th>Hex</th>
            </tr>
          </thead>
          <tbody>
            <tr className={changed.has('pc') ? 'value-changed' : ''}>
              <td className="reg-name">PC</td>
              <td>{registers.pc}</td>
              <td>{formatHex(registers.pc, 8)}</td>
            </tr>
            <tr className={changed.has('ccr') ? 'value-changed' : ''}>
              <td className="reg-name">CCR</td>
              <td>{registers.ccr}</td>
              <td>{formatHex(registers.ccr, 2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Registers;
