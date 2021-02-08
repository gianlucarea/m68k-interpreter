import React , {Component} from "react"

class Memory extends Component {
    render(){
        return ( 
            <div id="memory-area">
               
            </div>
       )  
        }
    }


export default Memory







/**    <div class="row justify-content-center" style="display: none;">
        <div class="col-md-8">
            <div class="form-inline text-center">
                <div class="form-group">
                    <label for="memory-address">Memory Address</label>
                    <input type="text" id="memory-address" class="form-control" placeholder="0x00000000"
                        value="0x00000000">
                </div>
                <button id="memory-go" class="btn btn-primary" style="margin-left: 1px" onclick="moveMemory()">Go</button>
                <button id="memory-next" class="btn btn-primary" style="margin-left: 1px" onclick="memoryPrevious()">&lt;</button>
                <button id="memory-previous" class="btn btn-primary" style="margin-left: 1px" onclick="memoryNext()">&gt;</button>
                <a id="memoryDownload" style="display:none"></a>
                <button id="memory-download" class="btn btn-primary" style="margin-left: 1px" onclick="memoryDownload()">Download!</button>
            </div>
            <br>
            <div id="memory-table" class="table-responsive">
                <table class="table table-hover table-condensed">
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
                        <tr>
                            <td>0x00000001</td>
                            <td>0</td>
                            <td>0x00</td>
                            <td>00000000</td>
                            <td> </td>
                        <tr>
                            <td>0x00000002</td>
                            <td>0</td>
                            <td>0x00</td>
                            <td>00000000</td>
                            <td> </td>
                        <tr>
                            <td>0x00000003</td>
                            <td>0</td>
                            <td>0x00</td>
                            <td>00000000</td>
                            <td> </td>
                        <tr>
                            <td>0x00000004</td>
                            <td>0</td>
                            <td>0x00</td>
                            <td>00000000</td>
                            <td> </td>
                        <tr>
                            <td>0x00000005</td>
                            <td>0</td>
                            <td>0x00</td>
                            <td>00000000</td>
                            <td> </td>
                        <tr>
                            <td>0x00000006</td>
                            <td>0</td>
                            <td>0x00</td>
                            <td>00000000</td>
                            <td> </td>
                        <tr>
                            <td>0x00000007</td>
                            <td>0</td>
                            <td>0x00</td>
                            <td>00000000</td>
                            <td> </td>
                        <tr>
                            <td>0x00000008</td>
                            <td>0</td>
                            <td>0x00</td>
                            <td>00000000</td>
                            <td> </td>
                        <tr>
                            <td>0x00000009</td>
                            <td>0</td>
                            <td>0x00</td>
                            <td>00000000</td>
                            <td> </td>
                    </tbody>
                </table>
            </div>
        </div>
    </div> */