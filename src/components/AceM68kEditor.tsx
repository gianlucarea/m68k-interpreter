import React from 'react';
import ace from 'ace-builds/src-noconflict/ace';
import 'ace-builds/src-noconflict/theme-textmate';
import { registerM68kMode } from '@/editor/m68kAceMode';

interface AceM68kEditorProps {
  value: string;
  onChange: (code: string) => void;
}

interface AceEditorInstance {
  session: {
    setUseWrapMode: (useWrapMode: boolean) => void;
    setTabSize: (tabSize: number) => void;
    setValue: (value: string) => void;
  };
  on: (eventName: string, callback: () => void) => void;
  getValue: () => string;
  getCursorPosition: () => { row: number; column: number };
  moveCursorToPosition: (position: { row: number; column: number }) => void;
  clearSelection: () => void;
  destroy: () => void;
}

interface AceRuntime {
  edit: (element: HTMLElement, options: Record<string, unknown>) => unknown;
}

const AceM68kEditor: React.FC<AceM68kEditorProps> = ({ value, onChange }) => {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const editorRef = React.useRef<AceEditorInstance | null>(null);

  React.useEffect(() => {
    registerM68kMode();
    const aceRuntime = ace as AceRuntime;

    if (!hostRef.current) {
      return;
    }

    const editor = aceRuntime.edit(hostRef.current, {
      mode: 'ace/mode/m68k',
      theme: 'ace/theme/textmate',
      fontSize: 13,
      showGutter: true,
      showPrintMargin: false,
      highlightActiveLine: true,
      useWorker: false,
    }) as AceEditorInstance;

    editor.session.setUseWrapMode(true);
    editor.session.setTabSize(2);
    editor.session.setValue('');

    editor.on('change', () => {
      onChange(editor.getValue());
    });

    editorRef.current = editor;

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, [onChange]);

  React.useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (editor.getValue() !== value) {
      const cursorPosition = editor.getCursorPosition();
      editor.session.setValue(value);
      editor.moveCursorToPosition(cursorPosition);
      editor.clearSelection();
    }
  }, [value]);

  return <div ref={hostRef} className="editor-ace" aria-label="Assembly editor" />;
};

export default AceM68kEditor;
