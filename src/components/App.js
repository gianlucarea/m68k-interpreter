import React , {Component} from "react"
import Required from "./Required"
import Optional from "./Optional"

class App extends Component {
    render(){
        return(
            <div>
                <Required />
                <Optional />             
            </div>
        )
    }
}

export default App;

     