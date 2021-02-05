import React , {Component} from "react"

class Register extends Component {
    render(){
        return(
            <div id="registers-section">
                <h3>Register Set</h3>
                <table className="table table-hover table-condensed registers-table">
                        <thead id="registers-head">
                            <tr>
                                <th>Register</th>
                                <th>Decimal Value</th>
                                <th>Hex</th>
                            </tr>
                        </thead>
                        <tbody id="registers">
                            <tr>
                                <td>a0</td>
                                <td><input id="0" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                            </tr>
                            <tr>
                                <td>a1</td>
                                <td><input id="1" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                            </tr>
                            <tr>
                                <td>a2</td>
                                <td><input id="2" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                            </tr>
                            <tr>
                                <td>a3</td>
                                <td><input id="3" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                            </tr>
                            <tr>
                                <td>a4</td>
                                <td><input id="4" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td>a5</td>
                                <td><input id="5" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td>a6</td>
                                <td><input id="6" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td>a7</td>
                                <td><input id="7" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td>d0</td>
                                <td><input id="8" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td>d1</td>
                                <td><input id="9" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td>d2</td>
                                <td><input id="10" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td>d3</td>
                                <td><input id="11" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td>d4</td>
                                <td><input id="12" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td>d5</td>
                                <td><input id="13" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td>d6</td>
                                <td><input id="14" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td>d7</td>
                                <td><input id="15" className="init-value" type="text" value="0"></input></td>
                                <td>0</td>
                            </tr>
                        </tbody>
                        <tbody id="PC">
                            <td>PC</td>
                            <td>0</td>
                            <td>0</td>
                        </tbody>
                    </table>


            </div>
            
        )
    }
        
    
}


export default Register