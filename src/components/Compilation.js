import React , {Component} from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock } from '@fortawesome/free-solid-svg-icons'

class Compilation extends Component {
    render(){
    return(
        <div id="text-try">
                <div id="last_instruction" className="last_instruction" >L'istruzione più recente verrà mostrata qui!</div> 
                <div id="delayHelp">
                <input type="number" id="delay" defaultValue="0" placeholder="0"></input>
                Delay Time   
                <FontAwesomeIcon icon={faClock} size="xl" id="clock-icon"/>
                </div>   
    </div>
    )
}
}

export default Compilation;