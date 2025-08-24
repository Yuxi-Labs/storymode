import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as storymode from '../../../../storymode.index';
import * as monaco from 'monaco-editor';
import { registerStoryModeLanguage, updateDiagnostics, STORYMODE_LANGUAGE_ID } from './language/storymode.monaco';
import { createInitialWorkspace, getFile, updateFile, addFile, newStoryTemplate, newNarrativeTemplate, setFileSaved, removeFile } from './workspace/filesystem';
import { PreviewPane } from './preview/PreviewPane';
import 'monaco-editor/min/vs/editor/editor.main.css';
import { TopMenuBar } from './components/TopMenuBar';

const sample = `::story: demo\nfiles:\n - demo.narrative\n`;

// Extend window interface for TypeScript
declare global {
  interface Window {
    storymodeAPI?: {
      onMenu: (handler: (payload: any) => void) => void;
      openFilesDialog?: () => Promise<{ canceled: boolean; files: { path: string; name: string; content: string; }[] }>;
      saveFile?: (name: string, content: string, suggestedPath?: string) => Promise<{ saved: boolean; path?: string }>;
      saveFileAs?: (name: string, content: string) => Promise<{ saved: boolean; path?: string }>;
    };
  }
}

export const App: React.FC = () => {
  const editorEl = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const [workspace, setWorkspace] = useState(() => createInitialWorkspace());
  const [activeFile, setActiveFile] = useState(workspace.active);
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [lastMenuCommand, setLastMenuCommand] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const browserFileInputRef = useRef<HTMLInputElement | null>(null);

  const importBrowserFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const tasks: Promise<{ name: string; content: string; }>[] = [];
    for (const f of Array.from(fileList)) {
      tasks.push(new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: f.name, content: reader.result as string });
        reader.readAsText(f);
      }));
    }
    Promise.all(tasks).then(results => {
      setWorkspace(ws => {
        results.forEach(r => {
          const existing = getFile(ws, r.name);
          if (existing) { existing.content = r.content; existing.dirty = false; existing.path = undefined; }
          else ws.files.push({ name: r.name, content: r.content, dirty: false });
        });
        if (results.length) ws.active = results[0].name;
        return { ...ws };
      });
    });
  }, []);

  const handleCommand = useCallback((cmd: string) => {
    setLastMenuCommand(cmd);
    if (cmd === 'preview-script') setShowPreview(true);
    if (cmd === 'new-story') {
      const id = `story_${Date.now()}`;
      const name = `${id}.story`;
  setWorkspace(ws => { addFile(ws, { name, content: newStoryTemplate(id), dirty: true }); return { ...ws }; });
  setActiveFile(name);
    }
    if (cmd === 'new-narrative') {
      const id = `narrative_${Date.now()}`;
      const name = `${id}.narrative`;
  setWorkspace(ws => { addFile(ws, { name, content: newNarrativeTemplate(id), dirty: true }); return { ...ws }; });
  setActiveFile(name);
    }
    if (cmd === 'open') {
      if (!window.storymodeAPI?.openFilesDialog) {
        // Browser fallback using hidden file input
        browserFileInputRef.current?.click();
      } else {
        window.storymodeAPI.openFilesDialog().then((res) => {
          if (!res || res.canceled) return;
          setWorkspace(ws => {
            res.files.forEach((f: any) => {
              const existing = getFile(ws, f.name);
              if (existing) { existing.content = f.content; existing.path = f.path; existing.dirty = false; }
              else ws.files.push({ name: f.name, content: f.content, path: f.path, dirty: false });
            });
            if (res.files.length) ws.active = res.files[0].name;
            return { ...ws };
          });
        });
      }
    }
    if (cmd === 'save') {
      const file = getFile(workspace, activeFile);
      if (file) {
        window.storymodeAPI?.saveFile && window.storymodeAPI.saveFile(file.name, file.content, file.path).then(r => {
          if (r?.saved && r.path) setWorkspace(ws => { setFileSaved(ws, file.name, r.path!); return { ...ws }; });
        });
      }
    }
    if (cmd === 'save-as') {
      const file = getFile(workspace, activeFile);
      if (file) {
        window.storymodeAPI?.saveFileAs && window.storymodeAPI.saveFileAs(file.name, file.content).then(r => {
          if (r?.saved && r.path) setWorkspace(ws => { setFileSaved(ws, file.name, r.path!); return { ...ws }; });
        });
      }
    }
    if (cmd === 'quit') window.close();
    if (cmd === 'delete-file') {
      const target = activeFile;
      setWorkspace(ws => { removeFile(ws, target); return { ...ws }; });
    }
    if (cmd === 'select-line') {
      const ed = editorRef.current; if (!ed) return;
      const pos = ed.getPosition(); if (!pos) return;
      ed.setSelection({ startLineNumber: pos.lineNumber, startColumn: 1, endLineNumber: pos.lineNumber, endColumn: ed.getModel()!.getLineMaxColumn(pos.lineNumber) });
      ed.focus();
    }
    if (cmd === 'select-block') {
      const ed = editorRef.current; if (!ed) return;
      const pos = ed.getPosition(); if (!pos) return;
      // Block heuristic: expand upward while previous line starts with space / punctuation or is blank, then downward similarly until blank line boundary.
      const model = ed.getModel(); if (!model) return;
      let start = pos.lineNumber; let end = pos.lineNumber;
      const max = model.getLineCount();
      const isBlockLine = (ln: number) => {
        if (ln < 1 || ln > max) return false;
        const text = model.getLineContent(ln).trim();
        if (text === '') return false;
        if (/^::(story|narrative|scene|end):/.test(text)) return false; // treat structural markers as boundaries
        return true;
      };
      while (isBlockLine(start - 1)) start--;
      while (isBlockLine(end + 1)) end++;
      ed.setSelection({ startLineNumber: start, startColumn: 1, endLineNumber: end, endColumn: model.getLineMaxColumn(end) });
      ed.focus();
    }
  }, [activeFile, workspace]);

  // Register language once
  useEffect(() => { registerStoryModeLanguage(); }, []);

  // Initialize or dispose editor depending on active file
  useEffect(() => {
    if (!editorEl.current) return;
    const currentFile = activeFile && getFile(workspace, activeFile);
    if (!currentFile) {
      // No file: dispose editor & model if exist
      if (editorRef.current) { editorRef.current.dispose(); editorRef.current = null; }
      if (modelRef.current) { modelRef.current.dispose(); modelRef.current = null; }
      setDiagnostics([]);
      return;
    }
    // Create or update model/editor
    let editor = editorRef.current;
    let model = modelRef.current;
    if (!model || modelRef.current?.uri.path !== currentFile.name) {
      if (modelRef.current) modelRef.current.dispose();
      model = monaco.editor.createModel(currentFile.content, STORYMODE_LANGUAGE_ID);
      modelRef.current = model;
    }
    if (!editor) {
      editor = monaco.editor.create(editorEl.current, {
        model,
        minimap: { enabled: false },
        theme: 'storymode-dark',
        readOnly: false
      });
      editorRef.current = editor;
      // Menu listener only once
      window.storymodeAPI?.onMenu((p) => handleCommand(p.command));
    } else {
      editor.setModel(model);
    }
  // Focus for new files
  setTimeout(() => { editorRef.current?.focus(); }, 0);
    // Recompute diagnostics logic
    let timer: any;
    const recompute = () => {
      if (!editor || !model) return;
      const text = editor.getValue();
      setWorkspace(ws => { updateFile(ws, activeFile, text); return { ...ws }; });
      updateDiagnostics(model, activeFile, text);
      try {
        if (/^::story:/m.test(text)) {
          const parsed = storymode.parseStoryFile(text, 'inline.story');
          const issues = storymode.validateStoryObject(parsed);
          setDiagnostics([...parsed.diagnostics, ...issues]);
        } else if (/^::narrative:/m.test(text)) {
          const parsed = storymode.parseNarrativeFile(text, 'inline.narrative');
          const issues = storymode.validateNarrativeObject(parsed);
          setDiagnostics([...parsed.diagnostics, ...issues]);
        } else {
          setDiagnostics([]);
        }
      } catch { /* ignore */ }
    };
    const sub = editor.onDidChangeModelContent(() => { clearTimeout(timer); timer = setTimeout(recompute, 150); });
    recompute();
    return () => { sub.dispose(); };
  }, [activeFile, workspace.files.length]);

  // Switch active file
  const openFile = useCallback((name: string) => {
    if (name === activeFile) return;
    const file = getFile(workspace, name);
    if (!file) return;
    if (!editorRef.current) return;
    const newModel = monaco.editor.createModel(file.content, STORYMODE_LANGUAGE_ID);
    modelRef.current?.dispose();
    modelRef.current = newModel;
    editorRef.current.setModel(newModel);
    setActiveFile(name);
    updateDiagnostics(newModel, name, file.content);
  }, [workspace, activeFile]);

  // Click navigation inside story file for list items
  useEffect(() => {
    const editor = editorRef.current; if (!editor) return;
    const disposable = editor.onMouseDown(e => {
      if (e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT) {
        const line = e.target.position!.lineNumber;
        const text = editor.getModel()!.getLineContent(line).trim();
        const fileItem = text.match(/^-\s+(.+\.narrative)$/);
        if (fileItem) openFile(fileItem[1]);
      }
    });
    return () => disposable.dispose();
  }, [openFile, activeFile]);

  return (
    <>
    <div className="flex flex-col h-full w-full">
      <input
        ref={browserFileInputRef}
        type="file"
        accept=".story,.narrative"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => { importBrowserFiles(e.target.files); if (browserFileInputRef.current) browserFileInputRef.current.value=''; }}
      />
  {!window.storymodeAPI && <TopMenuBar onCommand={handleCommand} />}
      <div className="flex flex-1 min-h-0">
      <div className="w-52 h-full border-r border-neutral-700 bg-neutral-950 text-neutral-300 text-xs p-2 space-y-1 relative">
        <div className="font-bold text-neutral-200 mb-1">Files</div>
        {workspace.files.map(f => {
          const label = f.dirty ? `${f.name}*` : f.name;
          return (
            <div key={f.name} className={`group flex items-center gap-1 w-full text-left px-2 py-1 rounded ${f.name===activeFile?'bg-neutral-700 text-white':'hover:bg-neutral-800'}`}>
              <button onClick={() => openFile(f.name)} className="flex-1 text-left truncate">{label}</button>
              <button
                title="Delete file"
                onClick={() => setWorkspace(ws => { removeFile(ws, f.name); return { ...ws }; })}
                className="opacity-0 group-hover:opacity-60 hover:opacity-100 text-red-400 text-xs px-1"
              >×</button>
            </div>
          );
        })}
      </div>
      <div ref={editorEl} className="flex-1 h-full relative">
        {workspace.files.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-neutral-400 select-none">
            <div className="text-xl font-semibold text-neutral-300">No files open</div>
            <div className="text-sm text-neutral-500">Create a new story to get started.</div>
            <button
              onClick={() => handleCommand('new-story')}
              className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
            >New Story</button>
          </div>
        )}
      </div>
      <div className="w-80 h-full border-l border-neutral-700 bg-neutral-900 text-neutral-200 text-sm overflow-auto p-3">
        <h2 className="font-semibold mb-2">Diagnostics</h2>
  {lastMenuCommand && <div className="mb-2 text-xs text-neutral-400">Menu: {lastMenuCommand}</div>}
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
    </div>
    {showPreview && <PreviewPane files={workspace.files} onClose={()=>setShowPreview(false)} />}
    </>
  );
};