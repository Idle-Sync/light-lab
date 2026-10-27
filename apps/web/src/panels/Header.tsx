import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { store, useAppState } from '../store';
import { exampleLinks } from './examples';
import { sceneFromFileText, sceneToFileText } from './file';
import { copyWithClipboard, shareSceneLink } from './share';

const copiedMessageMilliseconds = 2000;

function saveSceneFile(): void {
  const text = sceneToFileText(store.getState().scene);
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const download = document.createElement('a');
  download.href = url;
  download.download = 'light-lab-scene.json';
  download.click();
  URL.revokeObjectURL(url);
}

async function loadSceneFile(file: File): Promise<void> {
  try {
    store.replaceScene(sceneFromFileText(await file.text()));
    store.setLinkError(null);
  } catch (error) {
    store.setLinkError(`This file is not a Light Lab scene: ${(error as Error).message}`);
  }
}

export function Header() {
  const linkError = useAppState((state) => state.linkError);
  const [links, setLinks] = useState<Array<{ name: string; href: string }>>([]);
  const [copied, setCopied] = useState(false);
  const [manualLink, setManualLink] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const canUndo = useAppState(() => store.canUndo());
  const canRedo = useAppState(() => store.canRedo());

  const copiedTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    exampleLinks()
      .then(setLinks)
      .catch((error: unknown) => {
        store.setLinkError(`The example links could not be built: ${String(error)}`);
      });
  }, []);

  async function share(): Promise<void> {
    const baseUrl = `${location.origin}${location.pathname}`;
    setManualLink(null);
    const shared = await shareSceneLink(store.getState().scene, copyWithClipboard, baseUrl);
    if (!shared.copied) {
      setManualLink(shared.link);
      return;
    }
    setCopied(true);
    // A second Share restarts the message instead of letting the first timer hide it early.
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), copiedMessageMilliseconds);
  }

  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule bg-bench px-4 py-2">
      <span className="text-[15px] font-semibold tracking-tight">Light Lab</span>

      <nav aria-label="Examples" className="flex items-center gap-1">
        {links.map((link) => (
          <Button key={link.name} asChild variant="ghost" size="sm">
            <a href={link.href}>{link.name}</a>
          </Button>
        ))}
      </nav>

      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={store.clearScene}>
          New
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={!canUndo} onClick={store.undo}>
          Undo
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={!canRedo} onClick={store.redo}>
          Redo
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={saveSceneFile}>
          Save file
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
          Open file
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          aria-label="Scene file"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) loadSceneFile(file);
          }}
        />
        <Button type="button" variant="default" size="sm" onClick={share}>
          Share
        </Button>
      </div>

      {/* Kept in the DOM so screen readers announce the text when it appears. */}
      <span role="status">{copied ? 'Link copied' : ''}</span>
      {manualLink !== null && (
        <label className="flex items-center gap-2">
          <span>Copy this link</span>
          <input
            readOnly
            value={manualLink}
            onFocus={(event) => event.target.select()}
            className="w-64 rounded-md border border-rule bg-darkroom px-2 py-1 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        </label>
      )}
      {linkError !== null && (
        <span role="alert" className="text-sodium">
          {linkError}
        </span>
      )}
    </header>
  );
}
