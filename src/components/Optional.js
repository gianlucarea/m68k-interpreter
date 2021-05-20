import React , {Component} from "react";
import Memory from "./Optional-components/Memory"
import MMIO from "./Optional-components/MMIO"
import Flag from "./Optional-components/Flag"





class Optional extends Component {
    render() {
        return (
            <div>
                <Flag />
                <Memory/>
                <MMIO/>          
            </div>
        )
    }
}

export default Optional;