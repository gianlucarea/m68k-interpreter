import React , {Component} from "react"

class Flag extends Component {
    render(){
        return ( 
            <div id="flag-area-container" style={{display:"none"}}>
                <div id ="flag-area">
                    <div id="flag-table" className="table-responsive">
                        <table id="flag-table-f">
                            <thead id="flag-head">
                                <tr>
                                    <th>Extended (X)</th>
                                    <th>Negative (N)</th>
                                    <th>Zero (Z)</th>
                                    <th>Overflow (V)</th>
                                    <th>Carry (C)</th>
                                </tr>
                            </thead>
                            <tbody id="flag">
                                <tr id="flags-value">
                                    <td className="flag-value">0</td>
                                    <td className="flag-value">0</td>
                                    <td className="flag-value">0</td>
                                    <td className="flag-value">0</td>
                                    <td className="flag-value">0</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            )  
        }
    }


export default Flag