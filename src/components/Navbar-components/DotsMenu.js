import React , {Component} from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMemory } from '@fortawesome/free-solid-svg-icons'
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons'
import { faKeyboard} from '@fortawesome/free-solid-svg-icons'

class DotsMenu extends Component {
    render(){
        return ( 
            <div  id="navbar-dots">
            <a id="showMMIO" onClick={window.showMMIO}><FontAwesomeIcon icon={faKeyboard}/></a>
            <a id="showmemory" onClick={window.showmemory}><FontAwesomeIcon icon={faMemory}/></a>
            <a href="/help.html" ><FontAwesomeIcon icon={faQuestionCircle} /></a>
            </div>
       )  
        }
    }


export default DotsMenu