import * as monaco from 'monaco-editor';
import * as storymode from '../../../../../storymode.index';

const LANGUAGE_ID = 'storymode';

export function registerStoryModeLanguage() {
  if ((monaco.languages as any).getEncodedLanguageId(LANGUAGE_ID)) return; // already registered

  monaco.languages.register({ id: LANGUAGE_ID, extensions: ['.story', '.narrative'], aliases: ['StoryMode', 'storymode'] });

  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
    tokenizer: {
      root: [
        [/^::(story|narrative):.*/, 'keyword'],
        [/^::scene:.*/, 'keyword'],
        [/^::end:\s*\{\{.*\}\}.*/, 'keyword'],
        [/^@[a-zA-Z_][\w-]*:\s*.*/, 'type.identifier'],
        [/^(files:)/, 'type'],
        [/^\s*-\s+.+/, 'string'],
        [/^!(sfx|music|vfx):.*/, 'number'],
        [/\{\{.*?\}\}/, 'variable'],
        [/".*?"/, 'string'],
        [/'[^']*'/, 'string'],
      ]
    }
  });

  monaco.languages.registerHoverProvider(LANGUAGE_ID, {
    provideHover(model, position) {
      const line = model.getLineContent(position.lineNumber).trim();
      const directiveInfo: Record<string,string> = {
        '::story:': 'Defines the beginning of a story file with its id.',
        '::narrative:': 'Defines the beginning of a narrative file with its id.',
        '::scene:': 'Starts a scene block within a narrative.',
        '::end:': 'Marks the end of the current scene or file (must reference id).',
        'files:': 'List of narrative file paths included by this story.',
        '!sfx:': 'Sound effect cue list.',
        '!music:': 'Music cue list.',
        '!vfx:': 'Visual effect cue list.'
      };
      for (const key of Object.keys(directiveInfo)) {
        if (line.startsWith(key)) {
          return {
            range: new monaco.Range(position.lineNumber, 1, position.lineNumber, line.length + 1),
            contents: [
              { value: `**${key}**` },
              { value: directiveInfo[key] }
            ]
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

  // Definition provider for ids referenced in ::end: {{ id }}
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

  // Semantic tokens (simple classification of directive ids & metadata keys)
  const tokenTypes = ['keyword','type','parameter','variable','property'];
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
            push(i, start, idPart.trim().length, 3); // variable
          }
        } else if (/^::end:/.test(text)) {
          const idx = text.indexOf(':', 2);
          push(i, 0, idx+1, 0);
        } else if (/^@[a-zA-Z_][\w-]*:/.test(text)) {
          const key = text.match(/^@([a-zA-Z_][\w-]*):/);
          if (key) push(i, 1, key[1].length, 4); // property
        } else if (/^!(sfx|music|vfx):/.test(text)) {
          push(i, 0, text.indexOf(':')+1, 1); // type
        }
      }
      return { data: new Uint32Array(data), resultId: undefined };
    },
    releaseDocumentSemanticTokens() {}
  });

  // Simple dark theme extension
  monaco.editor.defineTheme('storymode-dark', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'keyword', foreground: '82AAFF' },
      { token: 'type.identifier', foreground: 'C792EA' },
      { token: 'type', foreground: 'C792EA' },
      { token: 'string', foreground: 'C3E88D' },
      { token: 'number', foreground: 'F78C6C' },
      { token: 'variable', foreground: 'FFCB6B' }
    ],
    colors: {}
  });

  // Code lens: scene summaries
  monaco.languages.registerCodeLensProvider(LANGUAGE_ID, {
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
  });
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