import React , {Component} from "react"
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-m68k";
import "ace-builds/src-noconflict/theme-monokai";

class Editor extends Component{

    onChange(newValue) {
       window.editor= newValue;
      }

    /**
     * @returns Default editor text at application start
     */
      setDefaultValue(){
        return "Org $1000 \n" + "* your code goes here * \n"+ "END"; 
    }

    render(){
        return(
            
                <div className="editor" >
                    <h3 className="text-editor-txt">Text Editor</h3>
                   <AceEditor 
                            mode="m68k"
                            theme="monokai"
                            width="100%"
                            height="93%"
                            id="editor"
                            onChange={this.onChange}
                            name="editor"
                            editorProps={{ $blockScrolling: true }}
                            fontSize="12pt"
                            defaultValue={this.setDefaultValue()}
                        /> 
                </div>
            
        )
    }


}



export default Editor 