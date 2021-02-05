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
                    <h3 className="text-editor-txt">Text Editor</h3>
                    <AceEditor
                            mode="m68k"
                            theme="monokai"
                            
                        // onChange={onChange}
                            width="100%"
                            height="94%"
                            name="UNIQUE_ID_OF_DIV"
                            editorProps={{ $blockScrolling: true }}
                            fontSize="12pt"
                            defaultValue="Org $1000 
                             * your code goes here *  END"
                        />, 
                </div>
            
        )
    }
}

export default Editor 