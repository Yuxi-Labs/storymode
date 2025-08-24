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
  setThemePreference?: (pref: 'auto'|'dark'|'light') => void;
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
  const [validationRunAt, setValidationRunAt] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{line:number;column:number}>({ line: 1, column: 1 });
  const [encoding, setEncoding] = useState<string>('');
  const [fileKind, setFileKind] = useState<string>('');

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

  // Dual system: colour mode + independent theme choice
  const [colorMode, setColorMode] = useState<'auto'|'dark'|'light'>('auto');
  const [themeChoice, setThemeChoice] = useState<'none'|'narnia'|'oldenglish'|'bleu'>('none');

  const applyVisuals = useCallback((nextColor: 'auto'|'dark'|'light', nextTheme: 'none'|'narnia'|'oldenglish'|'bleu') => {
    const root = document.documentElement;
    if (nextTheme === 'none') {
      if (nextColor === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', nextColor);
    } else {
      root.setAttribute('data-theme', nextTheme);
    }
    try { localStorage.setItem('storymode.colorMode', nextColor); } catch {}
    try { localStorage.setItem('storymode.themeChoice', nextTheme); } catch {}
    // Notify main process (uses a single value for menu sync; send the theme if set else color mode)
    // @ts-ignore broaden type
    window.storymodeAPI?.setThemePreference && window.storymodeAPI.setThemePreference(nextTheme === 'none' ? nextColor : nextTheme);
    if (nextTheme !== 'none') {
      if (nextTheme === 'narnia') monaco.editor.setTheme('storymode-narnia');
      else if (nextTheme === 'oldenglish') monaco.editor.setTheme('storymode-oldenglish');
      else if (nextTheme === 'bleu') monaco.editor.setTheme('storymode-bleu');
    } else {
      const effective = nextColor === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : nextColor;
      monaco.editor.setTheme(effective === 'light' ? 'storymode-light' : 'storymode-dark');
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    let savedColor: 'auto'|'dark'|'light' = 'auto';
    let savedTheme: 'none'|'narnia'|'oldenglish'|'bleu' = 'none';
    try { const c = localStorage.getItem('storymode.colorMode'); if (c==='dark'||c==='light'||c==='auto') savedColor = c; } catch {}
    try { const t = localStorage.getItem('storymode.themeChoice'); if (t==='narnia'||t==='oldenglish'||t==='bleu') savedTheme = t; } catch {}
    setColorMode(savedColor); setThemeChoice(savedTheme);
    applyVisuals(savedColor, savedTheme);
    if (savedColor === 'auto' && savedTheme === 'none') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => { applyVisuals('auto','none'); };
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, [applyVisuals]);

  const handleCommand = useCallback((cmd: string) => {
    setLastMenuCommand(cmd);
    if (cmd === 'preview-script' || cmd === 'preview-story') setShowPreview(true);
    if (cmd === 'validate-story') {
      // Force diagnostics refresh on all files
      console.log('[storymode][renderer] manual validate command');
      setValidationRunAt(Date.now());
      setWorkspace(ws => {
        ws.files.forEach(f => {
          // Update markers using a temporary model (avoid switching active editor)
          try {
            const tempModel = monaco.editor.createModel(f.content, STORYMODE_LANGUAGE_ID);
            updateDiagnostics(tempModel, f.name, f.content);
            tempModel.dispose();
          } catch {}
        });
        return { ...ws };
      });
    }
    if (cmd === 'print-story') {
      try {
        const all = workspace.files.map(f => `--- ${f.name} ---\n${f.content}\n`).join('\n');
        const w = window.open('', '_blank');
        if (w) {
          w.document.write(`<pre style="white-space:pre-wrap;font:12px/1.4 system-ui,monospace;">${all.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c] as string))}</pre>`);
          w.document.close();
          w.print();
        }
      } catch (e) { console.error('[storymode][renderer] print failed', e); }
    }
    if (cmd === 'new-story') {
      const createNewStory = () => {
        // Enforce single story rule
        const existingStory = workspace.files.find(f => f.name.endsWith('.story'));
        if (existingStory) {
          console.warn('[storymode][renderer] story already exists:', existingStory.name);
          try { window.alert('A story file already exists ("'+ existingStory.name +'"). Delete it first to create a new story.'); } catch {}
          // Focus existing story
          openFile(existingStory.name);
          return;
        }
  console.log('[storymode][renderer] new-story command received');
  let raw: string | null = null;
  try { raw = (typeof window !== 'undefined' ? window.prompt('Enter story name (letters, numbers, spaces, underscores):', 'name_of_story') : null); } catch {}
  if (!raw) raw = 'name_of_story';
        raw = raw.trim();
        if (!raw) raw = 'name_of_story';
        // slug
        let id = raw.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_\-]/g,'').replace(/_{2,}/g,'_').replace(/^_|_$/g,'');
        if (!id) id = `story_${Date.now()}`;
        // Ensure uniqueness among current files
        const base = id;
        let counter = 1;
        while (getFile(workspace, `${id}.story`)) {
          id = `${base}_${counter++}`;
        }
        const storyFileName = `${id}.story`;
        const firstNarr = `intro.narrative`;
        setWorkspace(ws => {
          addFile(ws, { name: storyFileName, content: newStoryTemplate(id, raw), dirty: true });
          if (!getFile(ws, firstNarr)) {
            addFile(ws, { name: firstNarr, content: newNarrativeTemplate('intro'), dirty: true });
          }
          return { ...ws }; 
        });
        setActiveFile(storyFileName);
  // Focus will occur via effect when model created
      };
      try { createNewStory(); } catch (e) { console.error('[storymode][renderer] failed to create new story', e); }
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
    if (cmd === 'undo') {
      const ed = editorRef.current; if (!ed) return; ed.trigger('keyboard','undo',null); ed.focus();
    }
    if (cmd === 'redo') {
      const ed = editorRef.current; if (!ed) return; ed.trigger('keyboard','redo',null); ed.focus();
    }
    if (cmd === 'cut') {
      const ed = editorRef.current; if (!ed) return; ed.trigger('keyboard','editor.action.clipboardCutAction',{}); ed.focus();
    }
    if (cmd === 'copy') {
      const ed = editorRef.current; if (!ed) return; ed.trigger('keyboard','editor.action.clipboardCopyAction',{}); ed.focus();
    }
    if (cmd === 'paste') {
      const ed = editorRef.current; if (!ed) return; ed.trigger('keyboard','editor.action.clipboardPasteAction',{}); ed.focus();
    }
    if (cmd === 'select-all') {
      const ed = editorRef.current; if (!ed) return; ed.trigger('keyboard','selectAll',{}); ed.focus();
    }
  if (cmd === 'theme-auto') { setColorMode('auto'); setThemeChoice('none'); applyVisuals('auto','none'); }
  if (cmd === 'theme-dark') { setColorMode('dark'); setThemeChoice('none'); applyVisuals('dark','none'); }
  if (cmd === 'theme-light') { setColorMode('light'); setThemeChoice('none'); applyVisuals('light','none'); }
  if (cmd === 'theme-clear') { setThemeChoice('none'); applyVisuals(colorMode,'none'); }
  if (cmd === 'theme-narnia') { setThemeChoice('narnia'); applyVisuals(colorMode,'narnia'); }
  if (cmd === 'theme-oldenglish') { setThemeChoice('oldenglish'); applyVisuals(colorMode,'oldenglish'); }
  if (cmd === 'theme-bleu') { setThemeChoice('bleu'); applyVisuals(colorMode,'bleu'); }
  }, [activeFile, workspace]);

  // Ensure native menu commands always reach renderer even when no editor model exists
  useEffect(() => {
    window.storymodeAPI?.onMenu((p) => {
      if (!p || !p.command) return;
      handleCommand(p.command);
    });
  }, [handleCommand]);

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
  setEncoding(''); setFileKind('');
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
  theme: 'storymode-dark', // will be flipped by applyTheme if needed
        readOnly: false
      });
      editorRef.current = editor;
      // Menu listener only once
      window.storymodeAPI?.onMenu((p) => handleCommand(p.command));
    } else {
      editor.setModel(model);
    }
    // Update encoding + kind when switching model
    const contentForMeta = model.getValue();
    setEncoding(contentForMeta.includes('\r\n') ? 'CRLF' : 'LF');
    setFileKind(activeFile.endsWith('.story') ? 'Story' : activeFile.endsWith('.narrative') ? 'Narrative' : '');
  // Focus for new files
  setTimeout(() => { editorRef.current?.focus(); }, 0);
    // Recompute diagnostics logic
    let timer: any;
    const recompute = () => {
      if (!editor || !model) return;
      const text = editor.getValue();
      setWorkspace(ws => { updateFile(ws, activeFile, text); return { ...ws }; });
      updateDiagnostics(model, activeFile, text);
      setEncoding(text.includes('\r\n') ? 'CRLF' : 'LF');
      try {
        if (/^::story:/m.test(text)) {
          const parsed = storymode.parseStoryFile(text, 'inline.story');
          const issues = storymode.validateStoryObject(parsed);
          setDiagnostics([...parsed.diagnostics, ...issues]);
          setFileKind('Story');
        } else if (/^::narrative:/m.test(text)) {
          const parsed = storymode.parseNarrativeFile(text, 'inline.narrative');
          const issues = storymode.validateNarrativeObject(parsed);
          setDiagnostics([...parsed.diagnostics, ...issues]);
          setFileKind('Narrative');
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

  // Cursor position tracking
  useEffect(() => {
    const editor = editorRef.current; if (!editor) return;
    setCursor({ line: editor.getPosition()?.lineNumber || 1, column: editor.getPosition()?.column || 1 });
    const disp = editor.onDidChangeCursorPosition(e => {
      setCursor({ line: e.position.lineNumber, column: e.position.column });
    });
    return () => disp.dispose();
  }, [activeFile]);

  // Ensure editor resizes when window or container size changes (prevents leftover whitespace after maximize)
  useEffect(() => {
    const relayout = () => { editorRef.current?.layout(); };
    window.addEventListener('resize', relayout);
    let ro: ResizeObserver | null = null;
    if (editorEl.current && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => relayout());
      ro.observe(editorEl.current);
    }
    return () => {
      window.removeEventListener('resize', relayout);
      ro && ro.disconnect();
    };
  }, []);

  return (
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
    <div className="sm-sidebar w-52 h-full border-r text-xs p-2 space-y-1 relative">
  <div className="font-bold mb-1" style={{color:'var(--sm-text)'}}>World</div>
        {workspace.files.map(f => {
          const label = f.dirty ? `${f.name}*` : f.name;
          const active = f.name === activeFile;
          return (
            <div key={f.name} className={`file-item group flex items-center gap-1 w-full text-left px-2 py-1 rounded ${active?'active':''}`}>
              <button onClick={() => openFile(f.name)} className="flex-1 text-left truncate" style={{background:'transparent'}}>{label}</button>
              <button
                title="Delete file"
                onClick={() => setWorkspace(ws => { removeFile(ws, f.name); return { ...ws }; })}
                className="opacity-0 group-hover:opacity-70 hover:opacity-100 text-red-400 text-xs px-1"
                style={{background:'transparent'}}
              >×</button>
            </div>
          );
        })}
      </div>
  <div ref={editorEl} className="flex-1 h-full relative" style={{background:'var(--sm-bg)'}}>
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
      <div className="sm-diagnostics w-80 h-full border-l text-sm overflow-auto p-3" style={{color:'var(--sm-text)'}}>
        <h2 className="font-semibold mb-2" style={{color:'var(--sm-text)'}}>Diagnostics</h2>
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
    {showPreview && <PreviewPane files={workspace.files} onClose={()=>setShowPreview(false)} />}
    {/* Status Bar */}
    <div style={{
      background:'var(--sm-panel)',
      borderTop:'1px solid var(--sm-border)',
      fontSize:12,
      padding:'2px 10px',
      display:'flex',
      alignItems:'center',
      gap:'16px',
      color:'var(--sm-text-dim)',
      userSelect:'none'
    }}>
      <div style={{color:'var(--sm-text)'}}>{activeFile || 'No File'}</div>
      {fileKind && <div>{fileKind}</div>}
      {encoding && <div>{encoding}</div>}
      <div>Ln {cursor.line}, Col {cursor.column}</div>
      {validationRunAt && <div title="Last manual validation">Validated {new Date(validationRunAt).toLocaleTimeString()}</div>}
      <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:12}}>
        <button title="Notifications" style={{background:'transparent',border:'none',color:'var(--sm-text-dim)',cursor:'pointer',fontSize:14,lineHeight:1}}>
          🔔
        </button>
      </div>
    </div>
    </div>
  );
};