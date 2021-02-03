import React , {Component} from "react"

class Register extends Component {
    render(){
        return(
            <div id="registers-section">
                <h1>Registri</h1>
                <table className="table table-hover table-condensed registers-table">
                        <thead id="registers-head">
                            <tr>
                                <th>Valore Decimale</th>
                                <th>Registro</th>
                                <th>Hex</th>
                            </tr>
                        </thead>
                        <tbody id="registers">
                            <tr>
                                <td><input id="0" className="init-value" type="text" value="0"></input></td>
                                <td>a0</td>
                                <td>0</td>
                            </tr>
                            <tr>
                                <td><input id="1" className="init-value" type="text" value="0"></input></td>
                                <td>a1</td>
                                <td>0</td>
                            </tr>
                            <tr>
                                <td><input id="2" className="init-value" type="text" value="0"></input></td>
                                <td>a2</td>
                                <td>0</td>
                            </tr>
                            <tr>
                                <td><input id="3" className="init-value" type="text" value="0"></input></td>
                                <td>a3</td>
                                <td>0</td>
                            </tr>
                            <tr>
                                <td><input id="4" className="init-value" type="text" value="0"></input></td>
                                <td>a4</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="5" className="init-value" type="text" value="0"></input></td>
                                <td>a5</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="6" className="init-value" type="text" value="0"></input></td>
                                <td>a6</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="7" className="init-value" type="text" value="0"></input></td>
                                <td>a7</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="8" className="init-value" type="text" value="0"></input></td>
                                <td>d0</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="9" className="init-value" type="text" value="0"></input></td>
                                <td>d1</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="10" className="init-value" type="text" value="0"></input></td>
                                <td>d2</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="11" className="init-value" type="text" value="0"></input></td>
                                <td>d3</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="12" className="init-value" type="text" value="0"></input></td>
                                <td>d4</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="13" className="init-value" type="text" value="0"></input></td>
                                <td>d5</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="14" className="init-value" type="text" value="0"></input></td>
                                <td>d6</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="15" className="init-value" type="text" value="0"></input></td>
                                <td>d7</td>
                                <td>0</td>
                            </tr>
                        </tbody>
                        <tbody id="PC">
                            <td>0</td>
                            <td>PC</td>
                            <td>0</td>
                        </tbody>
                    </table>


            </div>
            
        )
    }
        
    
}


export default Register