import React from 'react';
import { generatePreview, PreviewLine } from './PreviewGenerator';

interface Props {
  files: { name: string; content: string; }[];
  onClose: () => void;
}

export const PreviewPane: React.FC<Props> = ({ files, onClose }) => {
  const pages = generatePreview(files);
  return (
    <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-sm flex flex-col text-neutral-100">
      <div className="p-2 flex items-center gap-2 border-b border-neutral-700">
        <span className="font-semibold">Script Preview</span>
        <button onClick={onClose} className="ml-auto px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-sm">Close</button>
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {pages.map((p,i) => {
          const bodyClass = `flex-1 text-sm font-mono space-y-1 flex flex-col ${i===0 ? 'pt-[33%]' : ''}`;
          return (
          <div key={i} className="relative mx-auto bg-white text-neutral-900 shadow-md w-[816px] min-h-[1056px] p-12 flex flex-col print:shadow-none">
            <div className="text-xs text-neutral-400 absolute top-2 right-3">{p.title}</div>
            <div className={bodyClass}>
              {p.lines.map((l: PreviewLine, li: number) => {
                let cls = '';
                switch (l.kind) {
                  case 'title': cls = 'text-center text-3xl font-bold tracking-wide'; break;
                  case 'titleMeta': cls = 'text-center text-sm'; break;
                  case 'tocHeading': cls = 'text-center font-semibold underline mb-2'; break;
                  case 'tocEntry': cls = 'pl-2'; break;
                  case 'sceneHeading': cls = 'mt-4 mb-1 font-semibold uppercase tracking-wide'; break;
                  case 'action': cls = 'pl-4 italic'; break;
                  case 'cue': cls = 'pl-4 text-indigo-600'; break;
                  case 'character': cls = 'pl-16 font-semibold'; break;
                  case 'dialogue': cls = 'pl-20 pr-12 leading-snug'; break;
                  case 'creditsHeading': cls = 'text-center font-semibold text-lg'; break;
                  case 'creditsLine': cls = 'text-center text-sm'; break;
                  case 'end': cls = 'text-center font-semibold tracking-widest mt-32'; break;
                  case 'blank': cls = 'h-4'; break;
                }
    return <div key={li} className={cls}>{l.kind === 'blank' ? '\u00A0' : l.text}</div>;
              })}
            </div>
            <div className="text-center text-xs text-neutral-500 mt-8">{p.footer}</div>
          </div>
  );})}
      </div>
    </div>
  );
};