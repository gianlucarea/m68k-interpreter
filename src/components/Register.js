import React , {Component} from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileDownload } from '@fortawesome/free-solid-svg-icons'


class Register extends Component {

    constructor(props){
        super(props)
        this.state = {value:0}
        this.handleChange = this.handleChange.bind(this)
    }

    handleChange(event){
        this.setState({
            [event.target.value] : event.target.value
        })
    }

    render(){
        return(
            <div id="registers-section">
                <div id="registers-header">
                    <h3>Register Set</h3>
                    <div id="register-download-bt">
                        <a id="registerDownload" ></a>
                        <button id="register-download" class="btn btn-primary btn-lg" onClick={window.registersDownload}> <p>Download</p> <FontAwesomeIcon icon={faFileDownload} /> </button>
                    </div>
                </div>
                <table className="table table-hover table-condensed registers-table" id="register-table">
                        <thead id="registers-head">
                            <tr>
                                <th>Decimal Value</th>
                                <th>Register</th>
                                <th>Hex</th>
                            </tr>
                        </thead>
                        <tbody id="registers">
                            <tr>
                                <td><input id="0" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>a0</td>
                                <td>0</td>
                            </tr>
                            <tr>
                                <td><input id="1" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>a1</td>
                                <td>0</td>
                            </tr>
                            <tr>
                                <td><input id="2" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>a2</td>
                                <td>0</td>
                            </tr>
                            <tr>
                                <td><input id="3" className="init-value" type="text"   value={this.state.value}  onChange={this.handleChange}></input></td>
                                <td>a3</td>
                                <td>0</td>
                            </tr>
                            <tr>
                                <td><input id="4" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>a4</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="5" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>a5</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="6" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>a6</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="7" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>a7</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="8" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>d0</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="9" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>d1</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="10" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>d2</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="11" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>d3</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="12" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>d4</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="13" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>d5</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="14" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>d6</td>
                                <td>0</td>
                                </tr>
                            <tr>
                                <td><input id="15" className="init-value" type="text" value={this.state.value} onChange={this.handleChange}></input></td>
                                <td>d7</td>
                                <td>0</td>
                            </tr>
                        </tbody>
                        <tr id="PC">
                            <td>0</td>
                            <td>PC</td>
                            <td>0</td>
                        </tr>
                    </table>
            </div>
            
        )
    }
        
    
}


export default Register