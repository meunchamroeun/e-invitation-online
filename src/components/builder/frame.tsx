"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into a same-origin iframe via a React portal. The app's stylesheets are mirrored into the
 * frame, so Tailwind breakpoints respond to the *frame* width (true mobile/tablet preview) while React state,
 * event handlers and selection still live in the editor's tree.
 */
export function Frame({ children, className, title }: { children: ReactNode; className?: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;
    const setup = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      doc.open();
      doc.write('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div></body></html>');
      doc.close();
      // Incremental mirroring: clone each stylesheet node once, drop clones whose source disappeared,
      // and only update <style> text when it actually changed (dev HMR). Avoids re-downloading CSS/fonts.
      const clones = new Map<Element, HTMLElement>();
      const sync = () => {
        const sources = new Set(document.querySelectorAll('style, link[rel="stylesheet"]'));
        for (const [src, clone] of clones) if (!sources.has(src)) { clone.remove(); clones.delete(src); }
        sources.forEach((n) => {
          const existing = clones.get(n);
          if (!existing) {
            const c = n.cloneNode(true) as HTMLElement;
            doc.head.appendChild(c);
            clones.set(n, c);
          } else if (n.tagName === "STYLE" && existing.textContent !== n.textContent) existing.textContent = n.textContent;
        });
      };
      sync();
      // Dev HMR / lazily-injected styles: keep mirroring.
      const mo = new MutationObserver(sync);
      mo.observe(document.head, { childList: true, subtree: true, characterData: true });
      setMount(doc.getElementById("root"));
      return () => mo.disconnect();
    };
    let cleanup: (() => void) | undefined;
    if (iframe.contentDocument?.readyState === "complete") cleanup = setup();
    else iframe.addEventListener("load", () => { cleanup = setup(); }, { once: true });
    return () => cleanup?.();
  }, []);

  return (
    <iframe ref={ref} title={title} className={className} src="about:blank">
      {mount ? createPortal(children, mount) : null}
    </iframe>
  );
}
