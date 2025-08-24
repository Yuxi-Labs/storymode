import * as storymode from '../../../../../storymode.index';

export type PreviewLineKind =
  | 'title'
  | 'titleMeta'
  | 'tocHeading'
  | 'tocEntry'
  | 'sceneHeading'
  | 'action'
  | 'cue'
  | 'character'
  | 'dialogue'
  | 'blank'
  | 'creditsHeading'
  | 'creditsLine'
  | 'end';

export interface PreviewLine {
  kind: PreviewLineKind;
  text: string;
}

export interface PreviewPage {
  title?: string;
  lines: PreviewLine[];
  footer?: string;
}

interface WorkspaceLikeFile { name: string; content: string; }

export function generatePreview(files: WorkspaceLikeFile[]): PreviewPage[] {
  const storyFile = files.find(f => f.name.endsWith('.story'));
  if (!storyFile) return [{ lines: [{ kind: 'action', text: 'No story file found.' }] }];
  const story = storymode.parseStoryFile(storyFile.content, storyFile.name);
  const narratives = story.files.map(fn => {
    const f = files.find(x => x.name === fn);
    if (!f) return null;
    return storymode.parseNarrativeFile(f.content, f.name);
  }).filter(Boolean) as ReturnType<typeof storymode.parseNarrativeFile>[];

  const today = new Date();
  const dateStr = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(today);
  const title = story.metadata.title || story.id || 'Untitled Story';
  const authors: string[] = story.metadata.authors || [];
  const copyrightHolders: string[] = story.metadata.copyright_holders || authors;
  const revision = story.metadata.revision || 1;

  // Page numbering plan:
  // Title and ToC pages are unnumbered. Narrative pages start from 1.
  const arcPagesStart = 1;
  const arcCount = narratives.length;
  const creditsPageNumber = arcPagesStart + arcCount;
  const endPageNumber = creditsPageNumber + 1;

  // Build ToC entries with page references.
  // Simplistic: each narrative (arc) gets one page; scenes share that page number.
  const tocLines: PreviewLine[] = [];
  tocLines.push({ kind: 'tocHeading', text: 'Contents' });
  const dotLine = (label: string, page: number, indent = 0) => {
    const maxWidth = 76;
    const pageStr = `Page ${page}`;
    const base = ' '.repeat(indent) + label;
    const dots = '.' .repeat(Math.max(4, maxWidth - base.length - pageStr.length));
    return base + dots + pageStr;
  };
  narratives.forEach((narr, idx) => {
    const pageNum = arcPagesStart + idx;
    const arcTitle = narr.title || narr.id;
    tocLines.push({ kind: 'tocEntry', text: dotLine(arcTitle, pageNum) });
    narr.scenes.forEach(sc => {
      tocLines.push({ kind: 'tocEntry', text: dotLine(sc.title || sc.id, pageNum, 2) });
    });
  });

  // Title page
  const copyrightFooter = `© ${new Date().getFullYear()} ${copyrightHolders.join(', ')}  |  Revision ${revision}  |  ${dateStr}`;
  const titlePage: PreviewPage = {
    lines: [
      { kind: 'title', text: title },
      { kind: 'blank', text: '' },
      ...(authors.length ? [{ kind: 'titleMeta', text: `By ${authors.join(', ')}` } as PreviewLine] : [])
    ],
    footer: copyrightFooter
  };

  // Contents page
  const contentsPage: PreviewPage = { lines: tocLines };

  // Narrative pages
  const arcPages: PreviewPage[] = narratives.map(narr => ({
    title: narr.title || narr.id,
    lines: narr.scenes.flatMap(sc => {
      const lines: PreviewLine[] = [];
      lines.push({ kind: 'sceneHeading', text: sc.title || sc.id });
      // cues
      sc.cues.forEach(c => {
        lines.push({ kind: 'cue', text: `${c.type.toUpperCase()}: ${c.items.join(', ')}` });
      });
      // actions
      sc.actions.forEach(a => {
        lines.push({ kind: 'action', text: a.text });
      });
      // dialogue blocks
      sc.dialogue.forEach(block => {
        lines.push({ kind: 'character', text: block.character });
        block.lines.forEach(dl => {
          lines.push({ kind: 'dialogue', text: dl.text });
        });
        lines.push({ kind: 'blank', text: '' });
      });
      lines.push({ kind: 'blank', text: '' });
      return lines;
    })
  }));

  // Credits page
  const creditsPage: PreviewPage = {
    lines: [
      { kind: 'creditsHeading', text: 'Credits' },
      { kind: 'blank', text: '' },
      { kind: 'creditsLine', text: `Story: ${title}` },
      { kind: 'creditsLine', text: `Authors: ${authors.join(', ')}` },
      { kind: 'creditsLine', text: `Copyright Holders: ${copyrightHolders.join(', ')}` }
    ]
  };

  // End page
  const endPage: PreviewPage = { lines: [{ kind: 'end', text: 'THE END' }] };

  // Assemble pages. Only arc (narrative) pages get numbered; title, contents, credits, end remain unnumbered.
  const pages = [titlePage, contentsPage, ...arcPages, creditsPage, endPage];
  if (arcPages.length > 0) {
    const totalArc = arcPages.length;
    arcPages.forEach((p, idx) => {
      p.footer = `Page ${idx + 1} / ${totalArc}`;
    });
  }

  return pages;
}
