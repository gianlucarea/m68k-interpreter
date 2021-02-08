import React , {Component} from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock } from '@fortawesome/free-solid-svg-icons'
import { faMemory } from '@fortawesome/free-solid-svg-icons'
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons'

class DotsMenu extends Component {
    render(){
        return ( 
            <div  id="navbar-dots">
            <a href="#"><FontAwesomeIcon icon={faClock} /></a>
            <a href="#"><FontAwesomeIcon icon={faMemory} /></a>
            <a href="/help.html" ><FontAwesomeIcon icon={faQuestionCircle} /></a>
            </div>
       )  
        }
    }


export default DotsMenu