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
            <a id="run" className="command-icons" onClick={window.go}><FontAwesomeIcon icon={faPlay} /></a> 
            <a id="undo" className="command-icons" onClick={window.undo}><FontAwesomeIcon icon={faUndo} /></a> 
            <a id="step" className="command-icons" onClick={window.step}><FontAwesomeIcon icon={faRedo} /></a> 
            <a id="reset" className="command-icons" onClick={window.reset}><FontAwesomeIcon icon={faTimes} /></a> 
            </div>
        )
}
}

export default Command