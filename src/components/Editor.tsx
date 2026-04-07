import React from 'react';

interface EditorProps {
  code: string;
  onCodeChange: (code: string) => void;
}

const Editor: React.FC<EditorProps> = ({ code, onCodeChange }) => {
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    onCodeChange(e.target.value);
  };

  React.useEffect(() => {
    // Initialize global editor code
    (window as unknown as Record<string, string>).editorCode = code;
  }, [code]);

  return (
    <div className="editor-container">
      <h3 className="editor-title">Assembly Editor</h3>
      <textarea
        className="editor-textarea"
        value={code}
        onChange={handleCodeChange}
        spellCheck="false"
        placeholder="Enter M68K assembly code..."
      />
    </div>
  );
};

export default Editor;
