import React from 'react';
import AceM68kEditor from './AceM68kEditor';

interface EditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  theme: 'light' | 'dark';
  fileName: string;
  onResetEditor: () => void;
}

const Editor: React.FC<EditorProps> = ({ code, onCodeChange, theme, fileName, onResetEditor }) => {
  React.useEffect(() => {
    // Initialize global editor code
    (window as unknown as Record<string, string>).editorCode = code;
  }, [code]);

  return (
    <div className="editor-container">
      <div className="panel-heading">
        <span className="eyebrow">01 / SOURCE CODE</span>
        <button
          className="text-button"
          onClick={onResetEditor}
          title="Reset editor to starter code"
        >
          Reset source ↺
        </button>
      </div>
      <div className="editor-filebar">
        <h3>
          <span className="source-icon">⌘</span>
          {fileName}
        </h3>
        <span className="panel-meta">M68K Assembly</span>
      </div>
      <AceM68kEditor value={code} onChange={onCodeChange} theme={theme} />
      <div className="editor-statusbar">
        <span>{code.split('\n').length} lines</span>
        <span>
          UTF-8 <span className="footer-separator">/</span> Assembly
        </span>
      </div>
    </div>
  );
};

export default Editor;
