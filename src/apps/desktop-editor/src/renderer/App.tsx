import React, { useEffect, useRef, useState } from 'react';
import * as storymode from '../../../../storymode.index';
import * as monaco from 'monaco-editor';
import 'monaco-editor/min/vs/editor/editor.main.css';

const sample = `::story: demo\nfiles:\n - demo.narrative\n`;

export const App: React.FC = () => {
  const editorEl = useRef<HTMLDivElement | null>(null);
  const [diagnostics, setDiagnostics] = useState<any[]>([]);

  useEffect(() => {
    if (!editorEl.current) return;
    const editor = monaco.editor.create(editorEl.current, {
      value: sample,
      language: 'plaintext',
      minimap: { enabled: false },
      theme: 'vs-dark',
    });
    const sub = editor.onDidChangeModelContent(() => {
      const text = editor.getValue();
      try {
        const parsed = storymode.parseStoryFile(text, 'inline.story');
        const issues = storymode.validateStoryObject(parsed);
        setDiagnostics([...parsed.diagnostics, ...issues]);
      } catch (e) {
        // ignore
      }
    });
    // initial parse
    const parsed = storymode.parseStoryFile(sample, 'inline.story');
    setDiagnostics(parsed.diagnostics);
    return () => { sub.dispose(); editor.dispose(); };
  }, []);

  return (
    <div className="flex h-full w-full">
      <div ref={editorEl} className="flex-1 h-full" />
      <div className="w-80 h-full border-l border-neutral-700 bg-neutral-900 text-neutral-200 text-sm overflow-auto p-3">
        <h2 className="font-semibold mb-2">Diagnostics</h2>
        {diagnostics.length === 0 && <div className="italic text-neutral-500">No issues</div>}
        <ul className="space-y-1">
          {diagnostics.map((d, i) => (
            <li key={i} className="border border-neutral-700 rounded p-2">
              <div className="font-mono text-xs">{d.code || d.schemaPath}</div>
              <div>{d.message}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};