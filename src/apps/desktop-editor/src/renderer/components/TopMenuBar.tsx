import React, { useState } from 'react';

export interface MenuCommand {
  id: string;
  label: string;
  accelerator?: string;
}

interface MenuGroup {
  id: string;
  label: string;
  items: (MenuCommand | { type: 'separator' })[];
}

interface Props {
  onCommand: (id: string) => void;
}

const MENUS: MenuGroup[] = [
  {
    id: 'file',
    label: 'File',
    items: [
      { id: 'new-story', label: 'New Story', accelerator: 'Ctrl+N' },
      { id: 'new-narrative', label: 'New Narrative' },
      { type: 'separator' },
      { id: 'open', label: 'Open...', accelerator: 'Ctrl+O' },
      { id: 'save', label: 'Save', accelerator: 'Ctrl+S' },
      { id: 'save-as', label: 'Save As...', accelerator: 'Ctrl+Shift+S' },
      { type: 'separator' },
      { id: 'preview-script', label: 'Preview Script' },
      { type: 'separator' },
      { id: 'quit', label: 'Quit' }
    ]
  },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { id: 'undo', label: 'Undo' },
      { id: 'redo', label: 'Redo' },
      { type: 'separator' },
      { id: 'cut', label: 'Cut' },
      { id: 'copy', label: 'Copy' },
      { id: 'paste', label: 'Paste' },
      { id: 'select-all', label: 'Select All' }
    ]
  },
  {
    id: 'selection',
    label: 'Selection',
    items: [
      { id: 'select-line', label: 'Select Line' },
      { id: 'select-block', label: 'Select Block' }
    ]
  },
  {
    id: 'view',
    label: 'View',
    items: [
      { id: 'reload', label: 'Reload' },
      { id: 'toggle-devtools', label: 'Toggle Developer Tools' },
      { type: 'separator' },
      { id: 'toggle-fullscreen', label: 'Toggle Full Screen' }
    ]
  },
  {
    id: 'window',
    label: 'Window',
    items: [
      { id: 'minimize', label: 'Minimize' },
      { id: 'close', label: 'Close' }
    ]
  },
  {
    id: 'help',
    label: 'Help',
    items: [
      { id: 'help-learn-more', label: 'Learn More' }
    ]
  }
];

export const TopMenuBar: React.FC<Props> = ({ onCommand }) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleActivate = (cmd: string) => {
    onCommand(cmd);
    setOpenMenu(null);
  };

  return (
    <div className="select-none z-20 relative w-full bg-neutral-900 text-neutral-200 border-b border-neutral-700 text-sm">
      <ul className="flex gap-2 px-2">
        {MENUS.map(m => (
          <li key={m.id} className="relative">
            <button
              className={`px-2 py-1 rounded hover:bg-neutral-700 ${openMenu===m.id?'bg-neutral-700':''}`}
              onClick={() => setOpenMenu(openMenu===m.id?null:m.id)}
            >{m.label}</button>
            {openMenu===m.id && (
              <div className="absolute left-0 top-full mt-1 bg-neutral-800 border border-neutral-700 rounded shadow-lg min-w-[180px] py-1">
                {m.items.map((it,i) => {
                  if ((it as any).type === 'separator') return <div key={i} className="my-1 border-t border-neutral-700" />;
                  const cmd = it as MenuCommand;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => handleActivate(cmd.id)}
                      className="w-full flex items-center justify-between text-left px-3 py-1 hover:bg-neutral-600"
                    >
                      <span>{cmd.label}</span>
                      {cmd.accelerator && <span className="text-[10px] opacity-60 ml-4">{cmd.accelerator}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
