import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileDownload } from '@fortawesome/free-solid-svg-icons';
import { useEmulatorStore } from '@/stores/emulatorStore';

const Registers: React.FC = () => {
  const { registers, setRegisterInEmulator } = useEmulatorStore();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    registerName: string,
  ): void => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setRegisterInEmulator(registerName as never, value);
    }
  };

  const handleDownload = (): void => {
    const registerData = Object.entries(registers)
      .map(([name, value]) => `${name}=${value.toString(16).padStart(8, '0')}`)
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(registerData)}`);
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
        <h3>Register Set</h3>
        <button className="btn-download" onClick={handleDownload} title="Download registers">
          <FontAwesomeIcon icon={faFileDownload} size="lg" />
        </button>
      </div>

      <div className="registers-content">
        {/* Data and Address Registers - Side by Side */}
        <div className="registers-row">
          <table className="registers-table">
            <thead>
              <tr>
                <th colSpan={3}>Data Registers (D0-D7)</th>
              </tr>
              <tr>
                <th>Register</th>
                <th>Decimal</th>
                <th>Hex</th>
              </tr>
            </thead>
            <tbody>
              {dataRegisters.map((regName) => {
                const value = registers[regName as keyof typeof registers] ?? 0;
                return (
                  <tr key={regName}>
                    <td className="reg-name">{regName}</td>
                    <td>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => handleInputChange(e, regName)}
                      />
                    </td>
                    <td>{`0x${value.toString(16).padStart(8, '0')}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <table className="registers-table">
            <thead>
              <tr>
                <th colSpan={3}>Address Registers (A0-A7)</th>
              </tr>
              <tr>
                <th>Register</th>
                <th>Decimal</th>
                <th>Hex</th>
              </tr>
            </thead>
            <tbody>
              {addressRegisters.map((regName) => {
                const value = registers[regName as keyof typeof registers] ?? 0;
                return (
                  <tr key={regName}>
                    <td className="reg-name">{regName}</td>
                    <td>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => handleInputChange(e, regName)}
                      />
                    </td>
                    <td>{`0x${value.toString(16).padStart(8, '0')}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Control Registers */}
        <table className="registers-table">
          <thead>
            <tr>
              <th colSpan={3}>Control Registers</th>
            </tr>
            <tr>
              <th>Register</th>
              <th>Decimal</th>
              <th>Hex</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="reg-name">PC</td>
              <td>{registers.pc}</td>
              <td>{`0x${registers.pc.toString(16).padStart(8, '0')}`}</td>
            </tr>
            <tr>
              <td className="reg-name">CCR</td>
              <td>{registers.ccr}</td>
              <td>{`0x${registers.ccr.toString(16).padStart(2, '0')}`}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Registers;
