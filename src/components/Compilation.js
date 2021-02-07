import React , {Component} from "react"

class Compilation extends Component {
    render(){
    return(
        <div id="text-try">
                <div id="last_instruction" className="last_instruction" >L'istruzione più recente verrà mostrata qui!</div>    
                <div id="register-download-bt">
                    <a id="registerDownload" ></a>
                    <button id="register-download" class="btn btn-primary btn-lg" onClick={window.registersDownload}>Download Registers!</button>
                </div>
   
        </div>
    )
}
}

export default Compilation;