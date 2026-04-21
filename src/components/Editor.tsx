import React from 'react';
import AceM68kEditor from './AceM68kEditor';

interface EditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  theme: 'light' | 'dark';
}

const Editor: React.FC<EditorProps> = ({ code, onCodeChange, theme }) => {
  React.useEffect(() => {
    // Initialize global editor code
    (window as unknown as Record<string, string>).editorCode = code;
  }, [code]);

  return (
    <div className="editor-container">
      <h3 className="editor-title">Assembly Editor</h3>
      <AceM68kEditor value={code} onChange={onCodeChange} theme={theme} />
    </div>
  );
};

export default Editor;
