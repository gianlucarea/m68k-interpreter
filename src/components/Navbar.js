import React , {Component} from "react";
import Command from "./Navbar-components/Command"
import DotsMenu from "./Navbar-components/DotsMenu"

class Navbar extends Component {
    render() {
        return (
            <nav id="navbar">
            <Command />
            <h1 id="title-page">M68k Interpreter</h1>
            <DotsMenu />
            </nav>  
        )
    }
}

export default Navbar;