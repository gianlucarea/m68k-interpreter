import React , {Component} from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEllipsisH } from '@fortawesome/free-solid-svg-icons'
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons'

class DotsMenu extends Component {
    render(){
        return ( 
            <div  id="navbar-dots">
            <a href="/help.html" ><FontAwesomeIcon icon={faQuestionCircle} /></a>
            <a href="#"><FontAwesomeIcon icon={faEllipsisH} /></a>
            </div>
       )  
        }
    }


export default DotsMenu