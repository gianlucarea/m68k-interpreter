import React , {Component} from "react"
import Navbar from "./Navbar"
import Editor from "./Editor"
import Register from "./Register"
import Compilation from "./Compilation"

class App extends Component {
    render(){
        return(
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

export default App;