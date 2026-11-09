import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Meridian from '../lib/meridian';

/**
 * Runs the Meridian scroll engine over the routed page. It restarts on every
 * route change (new content to scan) and theme change (the HUD reads its
 * three tones from --c1/--c2/--c3 on the theme root at start-up).
 */
export function useMeridian(darkMode: boolean) {
  const { pathname } = useLocation();

  useEffect(() => {
    let cancelled = false;
    let instance: ReturnType<typeof Meridian.init> = null;

    // Wait for the lazy route to resolve and paint before scanning.
    const timer = window.setTimeout(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        Meridian.instance?.destroy();
        instance = Meridian.init({
          root: document.querySelector('.app-layer'),
          themeRoot: document.querySelector('#root > div'),
          exclude: 'nav, header, input, textarea, select, button, [role=dialog], [role=alert], [role=status], .mesh',
        });
      });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      instance?.destroy();
    };
  }, [pathname, darkMode]);
}
