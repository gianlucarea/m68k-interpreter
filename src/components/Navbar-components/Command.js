import React , {Component} from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay } from '@fortawesome/free-solid-svg-icons'
import { faUndo } from '@fortawesome/free-solid-svg-icons'
import { faRedo } from '@fortawesome/free-solid-svg-icons'
import { faTimes } from '@fortawesome/free-solid-svg-icons'


class Command extends Component {
    render (){
         return(
            <div className="navbar-commands">
            <a href="#" className="command-icons"><FontAwesomeIcon icon={faPlay} /></a> 
            <a href="#" className="command-icons"><FontAwesomeIcon icon={faUndo} /></a> 
            <a href="#" className="command-icons"><FontAwesomeIcon icon={faRedo} /></a> 
            <a href="#" className="command-icons"><FontAwesomeIcon icon={faTimes}/></a> 
            </div>
        )
}
}

export default Command