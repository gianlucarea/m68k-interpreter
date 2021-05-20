import React , {Component} from "react";
import Navbar from "./Required-components/Navbar"
import Editor from "./Required-components/Editor"
import Register from "./Required-components/Register"
import Compilation from "./Required-components/Compilation"



class Required extends Component {
    render() {
        return (
            <div>
                <Navbar />
                <div className="div-parent-editor">
                <Editor />
                <Register />
                </div>
                <Compilation/>
            </div>
        )
    }
}

export default Required;