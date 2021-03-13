import React , {Component} from "react"


class MMIO extends Component {
    render() {
        return(
            <div id="mmio-area-container" style={{display:"none"}}>
                <div id="mmio-area">
                    <div id="mmio-area-head">
                        <div id="display-txt">
                            <h1>Display</h1>
                            <p>Bla bla bla </p>
                        </div>
                        <div id="keyboard-txt">
                            <h1>Keyboard</h1>
                            <p>Bla bla bla</p>
                        </div>
                    </div>
                    <div id="mmio-area-body">
                        <div id="display-output">
                            <textarea id="display">
                                CAOéPSJ
                            </textarea>
                        </div>
                        <div id="keyboard-input">
                            <textarea id="keyboard">
                                CIAO
                            </textarea>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default MMIO;