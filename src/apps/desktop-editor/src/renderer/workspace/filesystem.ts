export interface WorkspaceFile {
  name: string; // file name with extension
  content: string;
  path?: string; // absolute path on disk if persisted
  dirty?: boolean; // unsaved changes since last save
}

export interface WorkspaceState {
  files: WorkspaceFile[];
  active: string; // name
}

export function createInitialWorkspace(): WorkspaceState {
  return {
    files: [
      {
        name: 'project.story',
  content: `::story: demo\nfiles:\n - intro.narrative\n - level1.narrative\n@title: Demo Project\n::end: {{ demo }}`,
  dirty: true
      },
      {
        name: 'intro.narrative',
  content: `::narrative: intro\n@title: Introduction\n::scene: opening\n!sfx: [ding]\n::end: {{ opening }}\n::end: {{ intro }}`,
  dirty: true
      },
      {
        name: 'level1.narrative',
  content: `::narrative: level1\n@title: Level 1\n::scene: start\n!music: [loop_theme]\n::end: {{ start }}\n::end: {{ level1 }}`,
  dirty: true
      }
    ],
    active: 'project.story'
  };
}

export function getFile(state: WorkspaceState, name: string) {
  return state.files.find(f => f.name === name);
}

export function updateFile(state: WorkspaceState, name: string, content: string) {
  const f = getFile(state, name);
  if (f) { f.content = content; f.dirty = true; }
}

export function addFile(state: WorkspaceState, file: WorkspaceFile) {
  state.files.push(file);
  state.active = file.name;
}

export function setFileSaved(state: WorkspaceState, name: string, path: string) {
  const f = getFile(state, name);
  if (f) { f.path = path; f.dirty = false; }
}

export function removeFile(state: WorkspaceState, name: string): boolean {
  const idx = state.files.findIndex(f => f.name === name);
  if (idx === -1) return false;
  state.files.splice(idx, 1);
  if (state.active === name) {
    state.active = state.files.length ? state.files[0].name : '';
  }
  return true;
}

export function newStoryTemplate(id: string): string {
  return `::story: ${id}\n@title: ${id.replace(/_/g,' ')}\nfiles:\n::end: {{ ${id} }}`;
}

export function newNarrativeTemplate(id: string): string {
  return `::narrative: ${id}\n@title: ${id.replace(/_/g,' ')}\n::scene: scene1\n@title: Scene 1\n::end: {{ scene1 }}\n::end: {{ ${id} }}`;
}