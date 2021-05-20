import React , {Component} from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMemory } from '@fortawesome/free-solid-svg-icons'
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons'
import { faKeyboard} from '@fortawesome/free-solid-svg-icons'
import { faFlag} from '@fortawesome/free-solid-svg-icons'


class DotsMenu extends Component {
    render(){
        return ( 
            <div  id="navbar-dots">
            <button id="showFlag" className="tools-icons" onClick={window.showFlag}><FontAwesomeIcon icon={faFlag}/></button>
            <button id="showMMIO" className="tools-icons" onClick={window.showMMIO}><FontAwesomeIcon icon={faKeyboard}/></button>
            <button id="showmemory" className="tools-icons" onClick={window.showmemory}><FontAwesomeIcon icon={faMemory}/></button>
            <a href="/help"  className="tools-icons"><FontAwesomeIcon icon={faQuestionCircle} /></a>
            </div>
       )  
        }
    }


export default DotsMenu