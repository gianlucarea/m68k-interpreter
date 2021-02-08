import React , {Component} from "react"
import Navbar from "./Navbar"
import Editor from "./Editor"
import Register from "./Register"
import Compilation from "./Compilation"
import Memory from "./Memory"

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
                <Memory/>
            </div>
        )
    }
}

export default App;