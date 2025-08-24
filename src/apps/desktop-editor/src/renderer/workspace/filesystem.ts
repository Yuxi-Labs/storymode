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
  content: `::story: demo\n  @title: Demo Project\n  @authors: Author Name\n  @copyright_holder: Copyright Holder\n  @address: 123 Example Road, City, Country\n  @email: contact@example.com\n  @phone: 0000 000 0000\n  @start: intro\n  files:\n    - intro.narrative\n    - level1.narrative\n::end: {{ demo }}`,
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

export function newStoryTemplate(id: string, titleOverride?: string): string {
  const baseName = (titleOverride || id).replace(/_/g,' ');
  // Starter narrative uses canonical name intro.narrative
  const firstNarr = `intro.narrative`;
  return `::story: ${id}\n  @title: ${baseName || 'Title of Story'}\n  @authors: Author Name\n  @copyright_holder: Copyright Holder\n  @address: 123 Example Road, City, Country\n  @email: contact@example.com\n  @phone: 0000 000 0000\n  @start: intro\n  files:\n    - ${firstNarr}\n::end: {{ ${id} }}`;
}

export function newNarrativeTemplate(id: string): string {
  const nice = id.replace(/_/g,' ');
  return `::narrative: ${id}\n  @title: ${nice}\n\n    ::scene: scene1\n      @title: Scene 1\n    ::end: {{ scene1 }}\n::end: {{ ${id} }}`;
}