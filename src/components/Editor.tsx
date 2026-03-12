import React, { useState } from 'react';

const Editor: React.FC = () => {
  const [code, setCode] = useState<string>(`ORG $1000
  * Write your M68K assembly code here
  * Your code goes here
END`);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setCode(e.target.value);
    // Store code globally for emulator access
    (window as unknown as Record<string, string>).editorCode = e.target.value;
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
