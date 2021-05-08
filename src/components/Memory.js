import React , {Component} from "react"

class Memory extends Component {
    render(){
        return ( 
                    <div id="memory-area-container" style={{display:"none"}}>
                        <div id="memory-area">
                        <div>
                            <div id="memory-area-header">
                                <div id="memory-address-head">
                                    <label>Memory Address</label>
                                    <input type="text" id="memory-address" className="form-control" placeholder="0x00000000" defaultValue="0x00000000"></input>
                                </div>
                                <div id="memory-btn-section">
                                <button id="memory-go" className="memory-btn"  onClick={window.moveMemory}>Go</button>
                                <button id="memory-next" className="memory-btn" onClick={window.memoryPrevious}>&lt;</button>
                                <button id="memory-previous" className="memory-btn"  onClick={window.memoryNext}>&gt;</button>
                                <a href="/null" id="memoryDownload" ></a>
                                <button id="memory-download" className="memory-btn" onClick={window.memoryDownload}>Download</button>
                                </div>
                            </div>
                            <div id="memory-table" className="table-responsive">
                                <table id="memory-table-f">
                                    <thead id="memory-head">
                                        <tr>
                                            <th>Memory Address</th>
                                            <th>Decimal</th>
                                            <th>Hex</th>
                                            <th>Binary</th>
                                            <th>ASCII</th>
                                        </tr>
                                    </thead>
                                    <tbody id="memory">
                                        <tr>
                                            <td>0x00000000</td>
                                            <td>0</td>
                                            <td>0x00</td>
                                            <td>00000000</td>
                                            <td> </td>
                                            </tr>
                                        <tr>
                                            <td>0x00000001</td>
                                            <td>0</td>
                                            <td>0x00</td>
                                            <td>00000000</td>
                                            <td> </td>
                                            </tr>
                                        <tr>
                                            <td>0x00000002</td>
                                            <td>0</td>
                                            <td>0x00</td>
                                            <td>00000000</td>
                                            <td> </td>
                                            </tr>
                                        <tr>
                                            <td>0x00000003</td>
                                            <td>0</td>
                                            <td>0x00</td>
                                            <td>00000000</td>
                                            <td> </td>
                                            </tr>
                                        <tr>
                                            <td>0x00000004</td>
                                            <td>0</td>
                                            <td>0x00</td>
                                            <td>00000000</td>
                                            <td> </td>
                                            </tr>
                                        <tr>
                                            <td>0x00000005</td>
                                            <td>0</td>
                                            <td>0x00</td>
                                            <td>00000000</td>
                                            <td> </td>
                                            </tr>
                                        <tr>
                                            <td>0x00000006</td>
                                            <td>0</td>
                                            <td>0x00</td>
                                            <td>00000000</td>
                                            <td> </td>
                                            </tr>
                                        <tr>
                                            <td>0x00000007</td>
                                            <td>0</td>
                                            <td>0x00</td>
                                            <td>00000000</td>
                                            <td> </td>
                                            </tr>
                                        <tr>
                                            <td>0x00000008</td>
                                            <td>0</td>
                                            <td>0x00</td>
                                            <td>00000000</td>
                                            <td> </td>
                                            </tr>
                                        <tr>
                                            <td>0x00000009</td>
                                            <td>0</td>
                                            <td>0x00</td>
                                            <td>00000000</td>
                                            <td> </td>
                                            </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        </div>
                        </div>)  
        }
    }


export default Memory