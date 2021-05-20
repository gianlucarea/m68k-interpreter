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
             <button id="run" className="command-icons" onClick={window.go}><FontAwesomeIcon icon={faPlay} /></button> 
            <button id="undo" className="command-icons" onClick={window.undo}><FontAwesomeIcon icon={faUndo} /></button> 
            <button id="step" className="command-icons" onClick={window.step}><FontAwesomeIcon icon={faRedo} /></button> 
            <button id="reset" className="command-icons" onClick={window.reset}><FontAwesomeIcon icon={faTimes} /></button>          </div>
        )
}
}

export default Command