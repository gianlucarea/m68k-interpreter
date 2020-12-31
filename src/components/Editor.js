import React , {Component} from "react"
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-m68k";
import "ace-builds/src-noconflict/theme-monokai";

class Editor extends Component{

    onChange() {
        console.log("change");
      }

    render(){
        return(
            
                <div className="editor">
                    <p className="text-editor-txt">Text Editor</p>
                    <AceEditor
                            mode="m68k"
                            theme="monokai"
                        // onChange={onChange}
                            width="100%"
                            name="UNIQUE_ID_OF_DIV"
                            editorProps={{ $blockScrolling: true }}
                            fontSize="14pt"
                        />, 
                </div>
            
        )
    }
}

export default Editor 