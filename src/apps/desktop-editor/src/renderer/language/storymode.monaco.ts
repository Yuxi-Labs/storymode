import * as monaco from 'monaco-editor';
import * as storymode from '../../../../../storymode.index';

const LANGUAGE_ID = 'storymode';

export function registerStoryModeLanguage() {
  try {
    // Previous guard attempted to skip registration using getEncodedLanguageId which could
    // return a falsy/zero value for unregistered languages in some Monaco versions, causing
    // premature returns and loss of highlighting. We intentionally always (re)register once
    // per app session; duplicate provider registrations are internally deduped by Monaco.
    // So we just log if a language with same id already exists without aborting.
    const existing = monaco.languages.getLanguages().some(l => l.id === LANGUAGE_ID);
    if (existing) {
      console.log('[storymode][lang] re-registering language to ensure providers active');
    }
  } catch (e) {
    console.warn('[storymode][lang] encoded id lookup failed (continuing)', e);
  }

  monaco.languages.register({ id: LANGUAGE_ID, extensions: ['.story', '.narrative'], aliases: ['StoryMode', 'storymode'] });

  try {
  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
    tokenPostfix: '.storymode',
    tokenizer: {
      root: [
        [/^\s*#.*/, 'comment'],
        // Directives (split parts)
        [/^(::)(story|narrative|scene)(:)(\s*[-a-zA-Z0-9_]+)/, ['directive.prefix','keyword','delimiter','directiveid']],
        [/^(::)(end)(:)(\s*)(\{\{)(\s*[-a-zA-Z0-9_]+\s*)(\}\})/, ['directive.prefix','keyword','delimiter','white','placeholder.brace','placeholder.id','placeholder.brace']],
        // Cues
        [/^!(sfx|music|vfx)(:)/, [{ token: 'cue' }, { token: 'delimiter' }]],
        [/^!(sfx|music|vfx):\s*\[[^\]]*\]/, 'cue'],
  // Metadata special cases (escape leading @ to prevent Monarch attribute lookup attempt)
  [/^(\@email)(:\s*)([^\s]+@[^\s]+)\s*$/, ['metakey','delimiter','metavalue.email']],
  [/^(\@phone)(:\s*)([0-9 ()+\-]+)\s*$/, ['metakey','delimiter','metavalue.phone']],
        // Metadata with array
        [/^(@[a-zA-Z_][\w-]*)(:\s*)(\[[^\]]*\])\s*$/, ['metakey','delimiter','array']],
        // Generic metadata
        [/^(@[a-zA-Z_][\w-]*)(:\s*)(.+)$/, ['metakey','delimiter','metavalue']],
        // files header
        [/^(files)(:)/, ['metakey','delimiter']],
        // File reference list item
        [/^(\s*)(-)(\s+)([A-Za-z0-9._\-]+\.narrative)\s*$/, ['white','bullet','white','fileref']],
        // Generic list item
        [/^\s*-\s+[^\s].*/, 'listitem'],
        // Placeholder split
        [/(\{\{)(\s*[-a-zA-Z0-9_]+\s*)(\}\})/, ['placeholder.brace','placeholder.id','placeholder.brace']],
        // Strings / arrays
        [/"([^"\\]|\\.)*"/, 'string'],
        [/'([^'\\]|\\.)*'/, 'string'],
        [/(\[)([^\]]*)(\])/, ['array.bracket','array.inner','array.bracket']],
        // Fallback dialogue/content
        [/^.+$/, 'dialogue']
      ]
    }
  });
  console.log('[storymode][lang] monarch provider registered');
  } catch (e) {
    console.error('[storymode][lang] error registering monarch provider', e);
  }

  try {
  monaco.languages.registerHoverProvider(LANGUAGE_ID, {
    provideHover(model, position) {
      const line = model.getLineContent(position.lineNumber).trim();
      const directiveInfo: Record<string,string> = {
        '::story:': 'Defines the beginning of a story file with its id.',
        '::narrative:': 'Defines the beginning of a narrative file with its id.',
        '::scene:': 'Starts a scene block within a narrative.',
        '::end:': 'Marks the end of a scene or file.',
        'files:': 'List of narrative file references.'
      };
      for (const key of Object.keys(directiveInfo)) {
        if (line.startsWith(key)) {
          return {
            range: new monaco.Range(position.lineNumber, 1, position.lineNumber, line.length + 1),
            contents: [ { value: `**${key}**` }, { value: directiveInfo[key] } ]
          };
        }
      }
      if (line.startsWith('@')) {
        return {
          range: new monaco.Range(position.lineNumber, 1, position.lineNumber, line.length + 1),
          contents: [ { value: '**Metadata** key-value pair' } ]
        };
      }
      return null;
    }
  });
  } catch (e) { console.error('[storymode][lang] hover provider error', e); }
  try {
  monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    triggerCharacters: [':', '@', '!'],
    provideCompletionItems(model, position) {
      const suggestions: monaco.languages.CompletionItem[] = [];
      const pre = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
      if (/^::\w*$/.test(pre) || pre === '::') {
        suggestions.push(
          ...['story', 'narrative', 'scene', 'end'].map(label => ({
            label: label + ':',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: label + ': ',
            range: undefined as any
          }))
        );
      }
      if (pre.startsWith('!')) {
        suggestions.push(...['sfx', 'music', 'vfx'].map(label => ({
          label: label + ':',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: `${label}: `,
          range: undefined as any
        })));
      }
      if (pre.startsWith('@')) {
        suggestions.push(...['title', 'authors', 'copyright_holders', 'variant_of'].map(label => ({
          label: label + ':',
          kind: monaco.languages.CompletionItemKind.Property,
          insertText: `${label}: `,
          range: undefined as any
        })));
      }
      // Snippets (always available at line start)
      if (/^\s*$/.test(pre)) {
        const cursorPos = position;
        const range: monaco.IRange = {
          startLineNumber: cursorPos.lineNumber,
          endLineNumber: cursorPos.lineNumber,
          startColumn: 1,
          endColumn: cursorPos.column
        };
        suggestions.push(
          {
            label: 'story template',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '::story: ${1:id}\nfiles:\n - ${2:file}.narrative\n@title: ${3:Title}\n::end: {{ ${1:id} }}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'Insert story boilerplate',
            range
          },
          {
            label: 'narrative template',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '::narrative: ${1:id}\n@title: ${2:Title}\n::scene: ${3:scene1}\n!sfx: [ding]\n::end: {{ ${3:scene1} }}\n::end: {{ ${1:id} }}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'Insert narrative boilerplate',
            range
          },
          {
            label: 'scene block',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '::scene: ${1:sceneId}\n!sfx: []\n::end: {{ ${1:sceneId} }}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'Insert scene skeleton',
            range
          }
        );
      }
      return { suggestions };
    }
  });
  } catch (e) { console.error('[storymode][lang] completion provider error', e); }

  // Definition provider for ids referenced in ::end: {{ id }}
  try {
  monaco.languages.registerDefinitionProvider(LANGUAGE_ID, {
    provideDefinition(model, position) {
      const line = model.getLineContent(position.lineNumber);
      const wordInfo = model.getWordAtPosition(position);
      if (!wordInfo) return;
      const word = wordInfo.word;
      const idDefRegex = /^::(story|narrative|scene):\s*(.+)$/;
      const lines = model.getLinesContent();
      let targetLine = -1;
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(idDefRegex);
        if (m && m[2].trim() === word) { targetLine = i + 1; break; }
      }
      if (targetLine === -1) return;
      return [{
        range: new monaco.Range(targetLine, 1, targetLine, lines[targetLine - 1].length + 1),
        uri: model.uri
      }];
    }
  });
  } catch (e) { console.error('[storymode][lang] definition provider error', e); }

  // Semantic tokens (simple classification of directive ids & metadata keys)
  const tokenTypes = ['keyword','type','parameter','variable','property','metakey','cue','array','listitem','metavalue','fileref','placeholder','directiveid'];
  try {
  monaco.languages.registerDocumentSemanticTokensProvider(LANGUAGE_ID, {
    getLegend() { return { tokenTypes, tokenModifiers: [] }; },
    provideDocumentSemanticTokens(model) {
      const lines = model.getLinesContent();
      const data: number[] = [];
      const push = (line: number, start: number, length: number, tokenType: number) => {
        data.push(line, start, length, tokenType, 0);
      };
      for (let i=0;i<lines.length;i++) {
        const text = lines[i];
        if (/^::(story|narrative|scene):/.test(text)) {
          const idx = text.indexOf(':');
          push(i, 0, idx+1, 0); // keyword
          const idPart = text.replace(/^::(story|narrative|scene):\s*/, '');
          if (idPart) {
            const start = text.length - idPart.length;
            push(i, start, idPart.trim().length, tokenTypes.indexOf('directiveid')); // directive id
          }
        } else if (/^::end:/.test(text)) {
          const idx = text.indexOf(':', 2);
          push(i, 0, idx+1, 0);
        } else if (/^@[a-zA-Z_][\w-]*:/.test(text)) {
          const key = text.match(/^@([a-zA-Z_][\w-]*):/);
          if (key) push(i, 1, key[1].length, 5); // metakey
          const valIdx = text.indexOf(':');
          if (valIdx !== -1) {
            const value = text.slice(valIdx+1).trim();
            if (value) push(i, text.indexOf(value), value.length, tokenTypes.indexOf('metavalue'));
          }
        } else if (/^!(sfx|music|vfx):/.test(text)) {
          push(i, 0, text.indexOf(':')+1, 6); // cue keyword
        } else if (/^files\s*:/.test(text)) {
          push(i, 0, 5, 5); // metakey 'files'
        } else if (/^\s*-\s+.+/.test(text)) {
          const start = text.indexOf('-');
          push(i, start, text.length - start, 8); // list item
        }
      }
      return { data: new Uint32Array(data), resultId: undefined };
    },
    releaseDocumentSemanticTokens() {}
  });
  } catch (e) { console.error('[storymode][lang] semantic tokens provider error', e); }

  // Simple dark theme extension
  try { monaco.editor.defineTheme('storymode-dark', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'keyword', foreground: 'FF9D00' },
      { token: 'directiveid', foreground: 'FFD54F', fontStyle: 'bold' },
      { token: 'directive.prefix', foreground: 'FFAB40' },
      { token: 'metakey', foreground: 'B794F6', fontStyle: 'bold' },
      { token: 'metavalue', foreground: '4FC1FF' },
      { token: 'metavalue.email', foreground: '80CBC4', fontStyle: 'underline' },
      { token: 'metavalue.phone', foreground: 'A5E075' },
      { token: 'cue', foreground: 'FF5370', fontStyle: 'bold' },
      { token: 'array', foreground: '80CBC4' },
      { token: 'array.bracket', foreground: '546E7A' },
      { token: 'array.inner', foreground: '80CBC4' },
      { token: 'listitem', foreground: 'C3E88D' },
      { token: 'fileref', foreground: '64B5F6', fontStyle: 'underline' },
      { token: 'placeholder', foreground: 'FFA500' },
      { token: 'placeholder.brace', foreground: 'FFAB40' },
      { token: 'placeholder.id', foreground: 'FFD54F' },
      { token: 'string', foreground: 'C3E88D' },
      { token: 'comment', foreground: '546E7A', fontStyle: 'italic' },
  { token: 'delimiter', foreground: 'A0A0A0' },
      { token: 'bullet', foreground: 'FFEB3B' },
      { token: 'dialogue', foreground: 'E0E0E0' }
    ],
    colors: {}
  }); } catch (e) { console.error('[storymode][lang] define dark theme failed', e); }

  try { monaco.editor.defineTheme('storymode-light', {
    base: 'vs', inherit: true,
    rules: [
      { token: 'keyword', foreground: 'C25E00' },
      { token: 'directiveid', foreground: '9C6500', fontStyle: 'bold' },
      { token: 'directive.prefix', foreground: 'D17A00' },
      { token: 'metakey', foreground: '7E3FB4', fontStyle: 'bold' },
      { token: 'metavalue', foreground: '1D43A3' },
      { token: 'metavalue.email', foreground: '00796B', fontStyle: 'underline' },
      { token: 'metavalue.phone', foreground: '2E7D32' },
      { token: 'cue', foreground: 'C62828', fontStyle: 'bold' },
      { token: 'array', foreground: '005B8E' },
      { token: 'array.bracket', foreground: '5C6F7B' },
      { token: 'array.inner', foreground: '005B8E' },
      { token: 'listitem', foreground: '2E7D32' },
      { token: 'fileref', foreground: '1565C0', fontStyle: 'underline' },
      { token: 'placeholder', foreground: 'D84315' },
      { token: 'placeholder.brace', foreground: 'BF360C' },
      { token: 'placeholder.id', foreground: '9C6500' },
      { token: 'string', foreground: '2E7D32' },
      { token: 'comment', foreground: '72757A', fontStyle: 'italic' },
  { token: 'delimiter', foreground: '606770' },
      { token: 'bullet', foreground: 'EF6C00' },
      { token: 'dialogue', foreground: '212121' }
    ],
    colors: {}
  }); } catch (e) { console.error('[storymode][lang] define light theme failed', e); }

  // Additional built-in themes
  try { monaco.editor.defineTheme('storymode-narnia', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'keyword', foreground: 'FFCA28' }, // amber
      { token: 'directiveid', foreground: 'FFD54F', fontStyle: 'bold' },
      { token: 'directive.prefix', foreground: 'FFB300' },
      { token: 'metakey', foreground: 'FBC02D', fontStyle: 'bold' },
      { token: 'metavalue', foreground: 'FFE082' },
      { token: 'metavalue.email', foreground: 'FFF59D', fontStyle: 'underline' },
      { token: 'metavalue.phone', foreground: 'C0CA33' },
      { token: 'cue', foreground: 'FF8F00', fontStyle: 'bold' },
      { token: 'array', foreground: 'FFD740' },
      { token: 'array.bracket', foreground: '8D6E63' },
      { token: 'array.inner', foreground: 'FFD740' },
      { token: 'listitem', foreground: 'C5E1A5' },
      { token: 'fileref', foreground: '81D4FA', fontStyle: 'underline' },
      { token: 'placeholder', foreground: 'FFB300' },
      { token: 'placeholder.brace', foreground: 'FFCA28' },
      { token: 'placeholder.id', foreground: 'FFF59D' },
      { token: 'string', foreground: 'C5E1A5' },
      { token: 'comment', foreground: '6D6D6D', fontStyle: 'italic' },
      { token: 'delimiter', foreground: 'B0A58F' },
      { token: 'bullet', foreground: 'FFE082' },
      { token: 'dialogue', foreground: 'F5F5F5' }
    ],
    colors: {
      'editor.background': '#1d1a13'
    }
  }); } catch (e) { console.error('[storymode][lang] define narnia theme failed', e); }

  try { monaco.editor.defineTheme('storymode-oldenglish', {
    base: 'vs', inherit: true,
    rules: [
      { token: 'keyword', foreground: '8B0000' },
      { token: 'directiveid', foreground: 'B22222', fontStyle: 'bold' },
      { token: 'directive.prefix', foreground: 'A52A2A' },
      { token: 'metakey', foreground: '2F4F4F', fontStyle: 'bold' },
      { token: 'metavalue', foreground: '3E2723' },
      { token: 'metavalue.email', foreground: '1B5E20', fontStyle: 'underline' },
      { token: 'metavalue.phone', foreground: '2E7D32' },
      { token: 'cue', foreground: 'B71C1C', fontStyle: 'bold' },
      { token: 'array', foreground: '37474F' },
      { token: 'array.bracket', foreground: '6D4C41' },
      { token: 'array.inner', foreground: '37474F' },
      { token: 'listitem', foreground: '2E7D32' },
      { token: 'fileref', foreground: '0D47A1', fontStyle: 'underline' },
      { token: 'placeholder', foreground: '6D4C41' },
      { token: 'placeholder.brace', foreground: '8D6E63' },
      { token: 'placeholder.id', foreground: '3E2723' },
      { token: 'string', foreground: '2E7D32' },
      { token: 'comment', foreground: '9E9E9E', fontStyle: 'italic' },
      { token: 'delimiter', foreground: '5D4037' },
      { token: 'bullet', foreground: 'A52A2A' },
      { token: 'dialogue', foreground: '212121' }
    ],
    colors: {
      'editor.background': '#f4f2ec'
    }
  }); } catch (e) { console.error('[storymode][lang] define oldenglish theme failed', e); }

  try { monaco.editor.defineTheme('storymode-bleu', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'keyword', foreground: '64B5F6' },
      { token: 'directiveid', foreground: '90CAF9', fontStyle: 'bold' },
      { token: 'directive.prefix', foreground: '42A5F5' },
      { token: 'metakey', foreground: '5E92F3', fontStyle: 'bold' },
      { token: 'metavalue', foreground: '4FC3F7' },
      { token: 'metavalue.email', foreground: '4DD0E1', fontStyle: 'underline' },
      { token: 'metavalue.phone', foreground: '26C6DA' },
      { token: 'cue', foreground: '1E88E5', fontStyle: 'bold' },
      { token: 'array', foreground: '29B6F6' },
      { token: 'array.bracket', foreground: '546E7A' },
      { token: 'array.inner', foreground: '29B6F6' },
      { token: 'listitem', foreground: '81D4FA' },
      { token: 'fileref', foreground: '4FC3F7', fontStyle: 'underline' },
      { token: 'placeholder', foreground: '42A5F5' },
      { token: 'placeholder.brace', foreground: '1976D2' },
      { token: 'placeholder.id', foreground: '90CAF9' },
      { token: 'string', foreground: '81C784' },
      { token: 'comment', foreground: '607D8B', fontStyle: 'italic' },
      { token: 'delimiter', foreground: '90A4AE' },
      { token: 'bullet', foreground: '64B5F6' },
      { token: 'dialogue', foreground: 'E0F7FA' }
    ],
    colors: {
      'editor.background': '#0f1419'
    }
  }); } catch (e) { console.error('[storymode][lang] define bleu theme failed', e); }

  // Code lens: scene summaries
  try { monaco.languages.registerCodeLensProvider(LANGUAGE_ID, {
    provideCodeLenses(model) {
      const lines = model.getLinesContent();
      const lenses: monaco.languages.CodeLens[] = [];
      for (let i=0;i<lines.length;i++) {
        const text = lines[i];
        const sceneMatch = text.match(/^::scene:\s*(.+)$/);
        if (sceneMatch) {
          // count cues until end or next scene
          let cues = 0;
            for (let j=i+1;j<lines.length;j++) {
              const lt = lines[j];
              if (/^::scene:/.test(lt) || /^::end:/.test(lt)) break;
              if (/^!(sfx|music|vfx):/.test(lt)) cues++;
            }
          lenses.push({
            range: new monaco.Range(i+1,1,i+1,1),
            id: `scene-${sceneMatch[1]}-${i}`,
            command: {
              id: 'storymode.scene.info',
              title: `Scene ${sceneMatch[1]} (cues: ${cues})`,
              arguments: [sceneMatch[1]]
            }
          });
        }
      }
      return { lenses, dispose() {} };
    }
  }); } catch (e) { console.error('[storymode][lang] code lens provider error', e); }
}

export function updateDiagnostics(model: monaco.editor.ITextModel, fileName: string, content: string) {
  // Decide kind by first directive
  let diagnostics: any[] = [];
  try {
    if (/^::story:/m.test(content)) {
      const parsed = storymode.parseStoryFile(content, fileName);
      const issues = storymode.validateStoryObject(parsed);
      diagnostics = [...parsed.diagnostics, ...issues];
    } else if (/^::narrative:/m.test(content)) {
      const parsed = storymode.parseNarrativeFile(content, fileName);
      const issues = storymode.validateNarrativeObject(parsed);
      diagnostics = [...parsed.diagnostics, ...issues];
    }
  } catch (e) {
    // parsing errors suppressed
  }
  const markers: monaco.editor.IMarkerData[] = diagnostics.map(d => ({
    message: d.message || d.schemaPath || 'Issue',
    severity: d.severity === 'error' ? monaco.MarkerSeverity.Error : d.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Info,
    startLineNumber: d.line || 1,
    startColumn: d.column || 1,
    endLineNumber: d.line || 1,
    endColumn: (d.column || 1) + 1,
    code: d.code
  }));
  monaco.editor.setModelMarkers(model, 'storymode', markers);
}

export const STORYMODE_LANGUAGE_ID = LANGUAGE_ID;