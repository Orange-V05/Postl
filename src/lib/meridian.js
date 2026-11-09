/*!
 * Meridian 2.0 — a heads-up-display scroll engine for any web page.
 *
 * Add one script tag. Meridian finds the content by itself (headings, text,
 * images, cards, lists, tables, form fields, dividers) and turns scrolling
 * into something that feels like operating an instrument:
 *
 *   Scan materialisation   Each element is "printed" into existence: targeting
 *                          brackets lock onto its outline, then a light beam
 *                          sweeps down through it. Above the beam the element is
 *                          real; below it there are only faint scanlines. Images
 *                          come through overexposed and colour-shifted, then
 *                          develop to their true colour.
 *   Cipher headings        Large headings decode letter by letter: a wave of
 *                          flickering glyphs runs ahead of the real text.
 *   Velocity warp          The faster you scroll, the more the page bends, like
 *                          a curved display, and splits into red/blue fringes
 *                          along the direction of travel. When you stop, every
 *                          element springs flat on its own spring.
 *   Negative-space streaks Light streaks fly through the empty space between
 *                          content at speed, never over the content itself.
 *   Autofocus              When you slow down, a reticle locks onto the image,
 *                          card or heading closest to the centre of the screen,
 *                          labels it, then dissolves.
 *   Tape ruler             A ticking measuring tape on the right edge shows where
 *                          you are and how fast you're moving.
 *
 * Colours adapt per element: cyan/magenta light on dark areas, electric blue
 * and magenta ink on light areas. Set your own with data-accent="#ff6a00".
 *
 * Usage
 *   <script src="meridian.js"></script>                          auto-starts
 *   <script src="meridian.js" data-warp="0.5" data-streaks="false"></script>
 *   <script src="meridian.js" data-auto="false"></script>  then Meridian.init({...})
 *
 * Per element
 *   data-meridian          animate this element as one unit
 *   data-meridian-ignore   leave this element and everything inside it alone
 *   data-meridian-native   wheel scrolling inside this element stays native
 *
 * All element motion runs through the Web Animations API, composited on top of
 * your own styles, so hover effects and CSS transforms keep working and
 * destroy() leaves the page exactly as it was. prefers-reduced-motion turns
 * everything into a quiet fade.
 *
 * MIT License.
 */
const Meridian = (function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { init: function () { return null; } };
  }

  var VERSION = '2.0.0';
  var doc = document;
  var html = doc.documentElement;

  var DEFAULTS = {
    root: null,            // element to scan (default <body>)
    smooth: false,         // POSTL keeps native scrolling; inertia fights trackpads
    smoothness: 9,         // higher = snappier
    wheelMultiplier: 1,
    reveal: true,          // scan materialisation
    threshold: 0.88,       // start when an element's top passes this fraction of the viewport
    silk: 0.6,             // elements trail behind on springs while scrolling (0 = off)
    warp: 0.35,            // speed bends the page (0 = off)
    chroma: 0.4,           // tone split at speed (0 = off)
    depth: 0.5,            // content fades slightly toward the screen edges (0 = off)
    hud: true,             // brackets, scan beams and other overlay graphics
    reticle: true,         // autofocus frame
    ruler: true,           // tape ruler on the right edge
    streaks: false,        // light streaks in empty space at speed
    decode: 'h2',          // headings that decode letter by letter ('' = off)
    accent: '',            // unused in POSTL: colours come from the --c1/--c2/--c3 theme tokens
    themeRoot: null,       // element carrying the theme tokens (default #root > div)
    selector: '',          // extra elements to always animate
    exclude: '',           // elements to leave alone
    anchorOffset: 0        // offset (px) when gliding to #anchors, e.g. a fixed header
  };

  // ───────────────────────────────────────── helpers

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function smoothstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function expoOut(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function sineInOut(t) { t = clamp(t, 0, 1); return -(Math.cos(Math.PI * t) - 1) / 2; }
  function quartOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 4); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  function now() { return performance.now(); }

  var supportsWAAPI = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
  var supportsIndividual = !!(window.CSS && CSS.supports && CSS.supports('translate', '1px 1px') && CSS.supports('scale', '1'));
  var supportsComposite = typeof KeyframeEffect !== 'undefined' && 'composite' in KeyframeEffect.prototype;
  var supportsClip = !!(window.CSS && CSS.supports && CSS.supports('clip-path', 'inset(1px 2px 3px 4px)'));
  var reducedQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function parseColor(str) {
    if (!str) return null;
    if (str.charAt(0) === '#') {
      var h = str.slice(1);
      if (h.length === 3) h = h.replace(/./g, '$&$&');
      var n = parseInt(h.slice(0, 6), 16);
      return isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
    }
    var m = str.match(/[\d.]+/g);
    if (!m || m.length < 3) return null;
    var k = /^color\(/.test(str) ? 255 : 1;
    return [+m[0] * k, +m[1] * k, +m[2] * k, m.length > 3 ? +m[3] : 1];
  }
  
  function addStyles(css) {
    try {
      if ('adoptedStyleSheets' in doc && typeof CSSStyleSheet === 'function') {
        var sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        doc.adoptedStyleSheets = doc.adoptedStyleSheets.concat([sheet]);
        return function () { doc.adoptedStyleSheets = doc.adoptedStyleSheets.filter(function (s) { return s !== sheet; }); };
      }
    } catch (e) { /* fall back */ }
    var el = doc.createElement('style');
    el.setAttribute('data-meridian-ignore', '');
    el.textContent = css;
    (doc.head || html).appendChild(el);
    return function () { el.remove(); };
  }

  var CSS_TEXT = [
    '.mrd-w{display:inline-block;white-space:nowrap}',
    '.mrd-c{position:relative}',
    '.mrd-c.mrd-h{color:transparent!important;-webkit-text-fill-color:transparent!important}',
    '.mrd-c[data-g]::after{content:attr(data-g);position:absolute;left:50%;top:0;transform:translateX(-50%);color:var(--mrd-g);-webkit-text-fill-color:var(--mrd-g);text-shadow:none;pointer-events:none}',
    '.mrd-cv{position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:40}',
    '@media print{.mrd-cv{display:none}.mrd-c.mrd-h{color:inherit!important;-webkit-text-fill-color:inherit!important}.mrd-c::after{display:none}}'
  ].join('');

  var GLYPHS = 'ABCDEFHJKLNPRSTUVXYZ0123456789<>/\\=+*#';
  function glyph() { return GLYPHS.charAt((Math.random() * GLYPHS.length) | 0); }

  // ───────────────────────────────────────── element classification

  var REJECT = 0, SKIP = 1;
  var SKIP_TAGS = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|LINK|META|BR|WBR|OPTION|OPTGROUP|SOURCE|TRACK|AREA|MAP|PARAM|HEAD|TITLE|DIALOG|SLOT|OBJECT|EMBED)$/;
  var ATOM_TAGS = /^(H1|H2|H3|H4|H5|H6|P|BLOCKQUOTE|PRE|FIGURE|IMG|PICTURE|VIDEO|CANVAS|SVG|IFRAME|TABLE|TR|LI|DT|DD|HR|BUTTON|INPUT|SELECT|TEXTAREA|FIGCAPTION|DETAILS|ADDRESS|LABEL|PROGRESS|METER|LEGEND)$/;
  var REPLACED = /^(IMG|VIDEO|CANVAS|SVG|IFRAME|INPUT|SELECT|TEXTAREA|BUTTON|PROGRESS|METER)$/;
  var MEDIA = /^(IMG|PICTURE|VIDEO|CANVAS|IFRAME)$/;
  var CONTAINERS = /^(DIV|SECTION|ARTICLE|ASIDE|MAIN|HEADER|FOOTER|NAV|A|SPAN|FORM|FIELDSET|UL|OL|DL|HGROUP|SEARCH|MENU)$/;
  var POPUP_ROLES = /^(dialog|alertdialog|menu|menubar|listbox|tooltip|tree|combobox|status|alert)$/;
  var TRANSPARENT = /(transparent|,\s*0\)|\/\s*0\)|,\s*0\.0+\))$/;

  function hasOwnText(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    return false;
  }
  function hasSurface(cs) {
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    if (cs.backgroundColor && !TRANSPARENT.test(cs.backgroundColor)) return true;
    if (cs.boxShadow && cs.boxShadow !== 'none') return true;
    var sides = 0;
    ['Top', 'Right', 'Bottom', 'Left'].forEach(function (s) {
      if (parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none' && !TRANSPARENT.test(cs['border' + s + 'Color'])) sides++;
    });
    return sides >= 3;
  }
  function clips(cs) { return cs.overflowX !== 'visible' || cs.overflowY !== 'visible'; }

  function findInnerMedia(el) {
    var list = el.querySelectorAll('img,video,canvas');
    for (var i = 0; i < list.length && i < 4; i++) {
      var m = list[i], p = m.parentElement;
      if (!p || !clips(getComputedStyle(p))) continue;
      var mr = m.getBoundingClientRect(), pr = p.getBoundingClientRect();
      if (pr.height < 60) continue;
      if (Math.abs(mr.width - pr.width) < 3 && Math.abs(mr.height - pr.height) < 3) {
        var mcs = getComputedStyle(m);
        if ((mcs.translate && mcs.translate !== 'none') || (mcs.scale && mcs.scale !== 'none')) continue;
        return m;
      }
    }
    return null;
  }

  // ───────────────────────────────────────── the engine

  function create(userOpts) {
    var o = {}, k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    for (k in userOpts || {}) if (userOpts[k] !== undefined) o[k] = userOpts[k];
    if (userOpts && userOpts.split !== undefined && userOpts.decode === undefined) o.decode = userOpts.split;

    var reduced = !!(reducedQuery && reducedQuery.matches);
    if (reduced) {
      o.smooth = false; o.silk = 0; o.warp = 0; o.chroma = 0; o.depth = 0;
      o.decode = ''; o.hud = false; o.reticle = false; o.ruler = false; o.streaks = false;
    }
    if (!supportsWAAPI) { o.reveal = false; o.silk = 0; o.warp = 0; o.chroma = 0; o.depth = 0; }
    if (!supportsComposite) o.warp = 0;          // 3D bending needs additive transforms
    if (!supportsComposite && !supportsIndividual) o.silk = 0;

    var root = o.root || doc.body;
    var atoms = [];
    var registry = new WeakMap();
    var visible = new Set();
    var cleanups = [];
    var raf = 0, idle = true, lastT = 0, firstFrame = true, destroyed = false, frameNo = 0;

    var scroller = window;
    var lastPos = scrollPosOf(window);
    var vel = 0;
    var warpAmt = 0, warpVel = 0;
    var glide = { active: false, target: 0, current: 0, written: 0, rate: o.smoothness };

    // POSTL palette: three tones from the theme tokens, cycled 1:1:1 so no
    // colour dominates. Strokes use each tone's ink shade (legible on the
    // tinted page); the companion colour is the next tone's fill.
    var FALLBACK = {
      light: { c: ['#8cc8ee', '#2fa58a', '#d6f04c'], ink: ['#1d5f8c', '#0b6e59', '#556500'] },
      dark: { c: ['#a3213f', '#ff8f45', '#e6b84e'], ink: ['#ff9bb0', '#ffa566', '#f0c85e'] }
    };
    function buildPals() {
      var tr = o.themeRoot || doc.querySelector('#root > div') || html;
      var dark = tr.classList.contains('dark') || html.classList.contains('dark');
      var theme = dark ? 'dark' : 'light';
      var cs = getComputedStyle(tr), fb = FALLBACK[theme], fills = [], inks = [];
      for (var i = 0; i < 3; i++) {
        fills.push(parseColor(cs.getPropertyValue('--c' + (i + 1)).trim()) || parseColor(fb.c[i]));
        inks.push(parseColor(cs.getPropertyValue('--c' + (i + 1) + '-ink').trim()) || parseColor(fb.ink[i]));
      }
      return [0, 1, 2].map(function (i) { return { id: theme + i, a: inks[i], b: fills[(i + 1) % 3] }; });
    }
    var PALS = buildPals();
    var toneCounter = 0;
    function rgba(c, al) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + r3(al) + ')'; }

    cleanups.push(addStyles(CSS_TEXT));

    // ── scanning ──────────────────────────────────────────

    function classify(el, vw, vh) {
      var tag = el.tagName.toUpperCase();
      if (SKIP_TAGS.test(tag)) return REJECT;
      if (el.hasAttribute('data-meridian-ignore') || el.hasAttribute('hidden')) return REJECT;
      if (o.exclude && el.matches(o.exclude)) return REJECT;
      var role = el.getAttribute('role');
      if (role && POPUP_ROLES.test(role)) return REJECT;
      if (el.getAttribute('aria-modal') === 'true') return REJECT;

      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return REJECT;
      if (cs.position === 'fixed' || cs.position === 'sticky') return REJECT;
      if (parseFloat(cs.opacity) < 0.05) return REJECT;
      if (cs.display === 'contents') return SKIP;

      var r = el.getBoundingClientRect();
      var forced = el.hasAttribute('data-meridian') || (o.selector && el.matches(o.selector));
      if (r.width < 2 || r.height < 2) return forced ? REJECT : SKIP;

      var inline = cs.display === 'inline';
      var tall = r.height > vh * 0.9;
      var hasKids = !!el.firstElementChild;

      if (forced) return { el: el, kind: kindForTag(el, tag, cs, r), cs: cs };

      if (ATOM_TAGS.test(tag)) {
        if (inline && !REPLACED.test(tag)) return SKIP;
        if (tall && hasKids && !/^(PRE|IMG|VIDEO|CANVAS|SVG|IFRAME|PICTURE)$/.test(tag)) return SKIP;
        return { el: el, kind: kindForTag(el, tag, cs, r), cs: cs };
      }
      if (CONTAINERS.test(tag) || tag.indexOf('-') > 0) {
        if (inline) return SKIP;
        var surface = hasSurface(cs);
        if (surface && r.height <= 4 && r.width > 24) return { el: el, kind: 'line', cs: cs };
        if (clips(cs) && el.children.length === 1 && MEDIA.test(el.firstElementChild.tagName.toUpperCase()) && !hasOwnText(el) && r.height < vh * 1.2) {
          return { el: el, kind: 'media', cs: cs, inner: findInnerMedia(el) };
        }
        if (surface && r.width < vw * 0.92 && r.height < vh * 0.8 && r.height >= 12) {
          return { el: el, kind: 'card', cs: cs, inner: findInnerMedia(el) };
        }
        if (hasOwnText(el) && !tall) return { el: el, kind: 'text', cs: cs };
        return SKIP;
      }
      return SKIP;
    }

    function kindForTag(el, tag, cs, r) {
      if (MEDIA.test(tag)) return 'media';
      if (tag === 'SVG') return (r.width >= 120 && r.height >= 120) ? 'media' : 'text';
      if (tag === 'FIGURE' && el.querySelector('img,video,canvas,picture,svg')) return 'media';
      if (tag === 'HR') return 'line';
      if (o.decode && el.matches(o.decode) && canDecode(el, cs)) return 'cipher';
      return 'text';
    }

    function canDecode(el, cs) {
      var text = el.textContent || '';
      if (!text.trim() || text.length > 160) return false;
      if (/text/.test(cs.backgroundClip + ' ' + (cs.webkitBackgroundClip || ''))) return false;
      var inner = el.querySelectorAll('*');
      for (var i = 0; i < inner.length; i++) {
        if (/^(SVG|IMG|SCRIPT|TEMPLATE|INPUT|BUTTON|CANVAS|VIDEO|svg)$/.test(inner[i].tagName)) return false;
        var ics = getComputedStyle(inner[i]);
        if (/text/.test(ics.backgroundClip + ' ' + (ics.webkitBackgroundClip || ''))) return false;
      }
      return true;
    }

    function scan() {
      var vw = window.innerWidth, vh = window.innerHeight, found = [];
      (function visit(parent) {
        for (var c = parent.firstElementChild; c; c = c.nextElementSibling) {
          if (registry.has(c)) continue;
          var res = classify(c, vw, vh);
          if (res === REJECT) continue;
          if (res === SKIP) { visit(c); continue; }
          found.push(res);
        }
      })(root);
      return found;
    }

    // ── atoms ─────────────────────────────────────────────

    function register(spec, instant) {
      var el = spec.el, cs = spec.cs;
      var a = {
        el: el, kind: spec.kind, inner: spec.inner || null,
        base: parseFloat(cs.opacity) || 1,
        moveT: supportsComposite,      // additive transform available
        moveI: !supportsComposite && supportsIndividual && (!cs.translate || cs.translate === 'none') && (!cs.scale || cs.scale === 'none'),
        // filters on top of backdrop blur (glass panels) force a full re-raster every frame
        canFilter: cs.filter === 'none' && (!cs.backdropFilter || cs.backdropFilter === 'none') &&
          !el.querySelector('.glass-panel, .frost, [class*="backdrop-blur"]'),
        canClip: supportsClip && cs.clipPath === 'none',
        revealed: !o.reveal, rStart: -1,
        y: 0, vy: 0, ty: 0,
        key: '', okey: '', ikey: '', fkey: '|',
        main: null, op: null, fx: null, innerAnim: null,
        chars: null, seed: Math.random() * 6.28
      };
      a.pal = PALS[(toneCounter++) % 3];

      // inside a clipping parent that hugs it (carousels, rounded frames): don't move it
      var par = el.parentElement;
      if (par && par !== doc.body) {
        var pcs = getComputedStyle(par);
        if (clips(pcs)) {
          var er = el.getBoundingClientRect(), pr = par.getBoundingClientRect();
          if (er.top - pr.top < 30 || pr.bottom - er.bottom < 30 || er.left - pr.left < 2 || pr.right - er.right < 2) {
            a.moveT = false; a.moveI = false; a.pinned = true;
          }
        }
      }
      if (reduced && o.reveal) a.kind = 'fade';

      registry.set(el, a);
      atoms.push(a);

      if (o.reveal) {
        var r = el.getBoundingClientRect();
        if (instant || r.bottom < 0) a.revealed = true;
        else {
          if (a.kind === 'cipher') splitChars(a);
          applyState(a, 0, 0, 0, 1, 0, 0);
        }
      }
      io && io.observe(el);
      return a;
    }

    function unregister(a) {
      if (a.main) a.main.cancel();
      if (a.op) a.op.cancel();
      if (a.fx) a.fx.cancel();
      if (a.innerAnim) a.innerAnim.cancel();
      a.main = a.op = a.fx = a.innerAnim = null;
      if (a.chars) unsplit(a);
      a.el.removeAttribute('data-mrd-live');
      io && io.unobserve(a.el);
      visible.delete(a);
      registry.delete(a.el);
    }

    function paused(el, frame, composite) {
      var opts = { duration: 1000, fill: 'both' };
      if (composite && supportsComposite) opts.composite = composite;
      var anim = el.animate([frame, frame], opts);
      anim.pause();
      anim.currentTime = 0;
      return anim;
    }

    function measure(a) {
      if (!a.size) {
        var w = a.el.offsetWidth, h = a.el.offsetHeight;
        if (w == null) { var r = a.el.getBoundingClientRect(); w = r.width; h = r.height; }
        a.size = { w: w || 200, h: h || 200 };
      }
      return a.size;
    }

    /**
     * Phase of an element's arrival.
     *   p   0..1 overall progress
     *   s   0..1 scan-beam position (0 = top edge, 1 = fully printed)
     */
    function scanOf(a, p) {
      if (a.kind === 'line' || a.kind === 'fade' || a.kind === 'cipher') return p;
      return sineInOut((p - 0.12) / 0.74);
    }

    var FLICKER = [1, 0.25, 0.85, 0.1, 0.7, 1, 0.45, 1];

    // Writes the element's motion for this frame.
    //   p: arrival progress, silkY: spring offset (px), d: offset from screen centre (-1..1),
    //   dop: edge fade factor, t: time, tall: 0..1 (1 = small element)
    function applyState(a, p, silkY, d, dop, t, tall) {
      var kind = a.kind, e = expoOut(p);
      var ty = 0, sc = 1, sx = 1, op = 1, filter = '', clip = '';

      if (p < 1) {
        var s = scanOf(a, p);
        if (kind === 'text' || kind === 'card' || kind === 'media') {
          ty = (1 - e) * (kind === 'card' ? 26 : 16);
          if (a.canClip) {
            if (s < 0.999) clip = 'inset(0px 0px ' + r2((1 - s) * 100) + '% 0px)';
          } else op = s;
          // hologram flicker while the beam is in the first quarter
          if (s > 0 && s < 0.22 && t) op *= FLICKER[((t - a.rStart) / 38 | 0) % FLICKER.length];
          if (kind === 'media' && a.canFilter) {
            var dev = sineInOut((p - 0.35) / 0.65);
            if (dev < 0.999) {
              filter = 'saturate(' + r3(mix(0.05, 1, dev)) + ') brightness(' + r3(mix(1.7, 1, dev)) +
                ') hue-rotate(' + r2((1 - dev) * -28) + 'deg) contrast(' + r3(mix(1.25, 1, dev)) + ')';
            }
          }
          if (kind === 'card') sc = mix(0.97, 1, e);
        } else if (kind === 'line') {
          sx = expoOut(p * 0.95);
        } else if (kind === 'cipher') {
          ty = (1 - e) * 10;
        } else if (kind === 'fade') {
          op = p;
        }
      }

      // velocity chroma: the element splits into red/blue along the direction of travel
      if (o.chroma > 0 && a.canFilter && !a.pinned && tall > 0.3) {
        var off = clamp(vel * 0.0019 * o.chroma, -6, 6) * tall;
        if (Math.abs(off) > 0.35) {
          var al = clamp(Math.abs(off) / 6, 0, 1) * 0.55;
          filter += (filter ? ' ' : '') + 'drop-shadow(0px ' + r2(off) + 'px 0px ' + rgba(a.pal.b, al) + ')' +
            (kind === 'media' ? '' : ' drop-shadow(0px ' + r2(-off * 0.8) + 'px 0px ' + rgba(a.pal.a, al) + ')');
        }
      }

      ty += silkY;
      op *= dop;

      var frame, key;
      if (a.moveT) {
        var angle = o.warp > 0 ? clamp(d, -1.3, 1.3) * 15 * warpAmt * o.warp * tall : 0;
        var tf = 'translateY(' + r2(ty) + 'px)';
        if (Math.abs(angle) > 0.01) tf += ' perspective(1100px) rotateX(' + r2(angle) + 'deg)';
        if (sc !== 1 || sx !== 1) tf += ' scale(' + r3(sx * sc) + ',' + r3(sc) + ')';
        frame = { transform: tf };
        key = tf;
      } else if (a.moveI) {
        frame = { translate: '0px ' + r2(ty) + 'px', scale: r3(sx * sc) + ' ' + r3(sc) };
        key = frame.translate + frame.scale;
      } else {
        frame = null;
        if (kind === 'line' && p < 1) op *= p;
      }
      if (frame && key !== a.key) {
        a.key = key;
        if (!a.main) a.main = paused(a.el, frame, a.moveT ? 'add' : 'replace');
        else a.main.effect.setKeyframes([frame, frame]);
      }
      a.ty = frame ? ty : 0;

      // filter + clip live in their own (replacing) animation; only used where the page has none
      var fkey = filter + '|' + clip;
      if (fkey !== a.fkey && (a.fx || fkey !== '|')) {
        a.fkey = fkey;
        var ff = {};
        if (filter) ff.filter = filter;
        if (clip) ff.clipPath = clip;
        if (!a.fx) a.fx = paused(a.el, ff, 'replace');
        else a.fx.effect.setKeyframes([ff, ff]);
      }

      // opacity is additive so the page's own opacity changes still work
      var ov = supportsComposite ? r3((op - 1) * a.base) : r3(op * a.base);
      var okey = '' + ov;
      if (okey !== a.okey) {
        a.okey = okey;
        var of = { opacity: ov };
        if (!a.op) a.op = paused(a.el, of, 'add');
        else a.op.effect.setKeyframes([of, of]);
      }

      // image drifting inside its frame
      if (a.inner && t && (supportsComposite || supportsIndividual)) {
        if (!a.innerH) a.innerH = a.inner.offsetHeight || 200;
        var drift = r2(clamp(-d, -1.2, 1.2) * 0.045 * a.innerH);
        if (('' + drift) !== a.ikey) {
          a.ikey = '' + drift;
          var inf = supportsComposite ? { transform: 'translateY(' + drift + 'px) scale(1.12)' } : { translate: '0px ' + drift + 'px', scale: '1.12' };
          if (!a.innerAnim) a.innerAnim = paused(a.inner, inf, supportsComposite ? 'add' : 'replace');
          else a.innerAnim.effect.setKeyframes([inf, inf]);
        }
      }
    }

    // ── cipher headings ─────────────────────────────────

    function splitChars(a) {
      var el = a.el;
      var walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      var chars = [], words = [];
      nodes.forEach(function (tn) {
        if (!tn.nodeValue.trim()) return;
        var frag = doc.createDocumentFragment();
        tn.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
          var w = doc.createElement('span');
          w.className = 'mrd-w';
          Array.from(part).forEach(function (ch) {
            var c = doc.createElement('span');
            c.className = 'mrd-c mrd-h';
            c.textContent = ch;
            c.st = 0;
            w.appendChild(c);
            chars.push(c);
          });
          frag.appendChild(w);
          words.push(w);
        });
        tn.parentNode.replaceChild(frag, tn);
      });
      a.chars = chars;
      a.words = words;
      el.setAttribute('data-mrd-split', '');
      el.style.setProperty('--mrd-g', rgba(a.pal.a, 1));
      el.style.setProperty('--mrd-gs', rgba(a.pal.a, 0.55));
      a.msPerChar = clamp(1500 / chars.length, 16, 48);
    }

    function unsplit(a) {
      if (!a.words) return;
      a.words.forEach(function (w) {
        if (w.parentNode) w.parentNode.replaceChild(doc.createTextNode(w.textContent), w);
      });
      a.el.normalize();
      a.el.setAttribute('data-mrd-split', 'done');
      a.el.style.removeProperty('--mrd-g');
      a.el.style.removeProperty('--mrd-gs');
      a.chars = a.words = null;
    }

    var WINDOW = 6;
    function stepCipher(a, t) {
      if (!a.chars) return true;
      var n = a.chars.length;
      var front = (t - a.rStart) / a.msPerChar;
      var shuffle = ((t / 55) | 0) !== a.lastShuffle;
      a.lastShuffle = (t / 55) | 0;
      for (var i = 0; i < n; i++) {
        var c = a.chars[i];
        var want = i < front - WINDOW ? 2 : i < front ? 1 : 0;
        if (want === 2 && c.st !== 2) { c.classList.remove('mrd-h'); c.removeAttribute('data-g'); }
        else if (want === 1 && (c.st !== 1 || shuffle)) { if (c.st !== 1) c.classList.add('mrd-h'); c.setAttribute('data-g', glyph()); }
        c.st = want;
      }
      if (front > n + WINDOW) { unsplit(a); return true; }
      return false;
    }

    // ── visibility ───────────────────────────────────────

    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var a = registry.get(entries[i].target);
          if (!a) continue;
          if (entries[i].isIntersecting) {
            if (!visible.has(a)) { visible.add(a); a.el.setAttribute('data-mrd-live', ''); }
          } else if (visible.has(a)) {
            visible.delete(a);
            a.el.removeAttribute('data-mrd-live');
            a.y = 0; a.vy = 0;
            applyState(a, a.revealed ? 1 : 0, 0, 0, 1, 0, 0);
          }
        }
        kick();
      }, { rootMargin: '20% 0px 20% 0px', threshold: 0 });
    }

    // ── scrolling ────────────────────────────────────────

    function scrollPosOf(s) { return s === window ? window.scrollY || window.pageYOffset || 0 : s.scrollTop; }
    function maxScroll() { return Math.max(0, (doc.scrollingElement || html).scrollHeight - window.innerHeight); }
    function maxOf(s) { return s === window ? maxScroll() : Math.max(0, s.scrollHeight - s.clientHeight); }

    function locked() {
      var hcs = getComputedStyle(html), bcs = doc.body ? getComputedStyle(doc.body) : null;
      if (hcs.overflowY === 'hidden' || hcs.overflowY === 'clip') return true;
      if (bcs && (bcs.overflowY === 'hidden' || bcs.overflowY === 'clip') && hcs.overflowY === 'visible') return true;
      if (hcs.scrollSnapType && hcs.scrollSnapType !== 'none') return true;
      if (bcs && bcs.scrollSnapType && bcs.scrollSnapType !== 'none') return true;
      return false;
    }

    function nestedCanScroll(node, dy) {
      for (var el = node; el && el !== doc.body && el !== html && el.nodeType === 1; el = el.parentElement) {
        if (el.hasAttribute('data-meridian-native') || el.hasAttribute('data-lenis-prevent')) return true;
        if (el.scrollHeight <= el.clientHeight + 1) continue;
        var oy = getComputedStyle(el).overflowY;
        if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') continue;
        if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
        if (dy < 0 && el.scrollTop > 0) return true;
      }
      return false;
    }

    function startGlide(rate) {
      if (!glide.active) {
        glide.current = window.scrollY;
        glide.target = window.scrollY;
        glide.written = Math.round(window.scrollY);
      }
      glide.rate = rate || o.smoothness;
      glide.active = true;
      scroller = window;
      kick();
    }
    function glideBy(dy, rate) { var was = glide.active; startGlide(rate); glide.target = clamp((was ? glide.target : window.scrollY) + dy, 0, maxScroll()); }
    function glideTo(y, rate) { startGlide(rate); glide.target = clamp(y, 0, maxScroll()); }

    function onWheel(e) {
      if (!o.smooth || e.defaultPrevented || e.ctrlKey) return;
      var dy = e.deltaY, dx = e.deltaX;
      if (e.deltaMode === 1) { dy *= 40; dx *= 40; }
      else if (e.deltaMode === 2) { dy *= window.innerHeight; dx *= window.innerWidth; }
      if (e.shiftKey || Math.abs(dx) > Math.abs(dy) || dy === 0) return;
      var max = maxScroll();
      if (max <= 0 || locked()) return;
      if (nestedCanScroll(e.target, dy)) return;
      var from = glide.active ? glide.target : window.scrollY;
      if ((dy > 0 && from >= max - 0.5) || (dy < 0 && from <= 0.5)) return;
      e.preventDefault();
      glideBy(dy * o.wheelMultiplier);
    }

    function onKey(e) {
      if (!o.smooth || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target;
      if (t && t.nodeType === 1 && t !== doc.body && t !== html) {
        if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|VIDEO|AUDIO|IFRAME|SUMMARY)$/.test(t.tagName)) return;
        if (t.closest && t.closest('[role="slider"],[role="listbox"],[role="menu"],[role="grid"],[role="tablist"],[role="radiogroup"]')) return;
      }
      var vh = window.innerHeight, dy = 0;
      switch (e.key) {
        case 'ArrowDown': dy = 110; break;
        case 'ArrowUp': dy = -110; break;
        case 'PageDown': dy = vh * 0.86; break;
        case 'PageUp': dy = -vh * 0.86; break;
        case ' ': case 'Spacebar': if (t && t.tagName === 'A') return; dy = (e.shiftKey ? -1 : 1) * vh * 0.86; break;
        case 'Home': dy = -Infinity; break;
        case 'End': dy = Infinity; break;
        default: return;
      }
      if (maxScroll() <= 0 || locked()) return;
      if (t && t.nodeType === 1 && isFinite(dy) && nestedCanScroll(t, dy)) return;
      e.preventDefault();
      if (!isFinite(dy)) glideTo(dy > 0 ? maxScroll() : 0, 6);
      else glideBy(dy);
    }

    function anchorTargetY(target) {
      var r = target.getBoundingClientRect();
      var a = registry.get(target);
      var top = r.top - (a ? a.ty : 0) + window.scrollY;
      var smt = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      var spt = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
      return top - smt - spt - (o.anchorOffset || 0);
    }

    function onClick(e) {
      if (!o.smooth || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a || a.target === '_blank') return;
      var href = a.getAttribute('href');
      if (href.length > 1 && href.charAt(1) === '/') return;
      var target = null;
      if (href === '#' || href === '#top') target = 'top';
      else {
        var id;
        try { id = decodeURIComponent(href.slice(1)); } catch (err) { id = href.slice(1); }
        target = doc.getElementById(id) || doc.getElementsByName(id)[0] || null;
      }
      if (!target || locked()) return;
      e.preventDefault();
      if (target === 'top') glideTo(0, 5);
      else {
        glideTo(anchorTargetY(target), 5);
        if (!target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
        try { target.focus({ preventScroll: true }); } catch (err) { /* ignore */ }
      }
      try { if (location.hash !== href) history.pushState(null, '', href); } catch (err) { /* sandboxed */ }
    }

    function onScroll(e) {
      var t = e.target;
      var s = (t === doc || t === html || t === doc.body || t === doc.scrollingElement) ? window : t;
      if (s !== scroller) {
        if (s !== window && !(s instanceof Element)) return;
        if (s !== window && s.getBoundingClientRect().height < window.innerHeight * 0.5) return;
        scroller = s;
        lastPos = scrollPosOf(s);
      }
      kick();
    }

    // ── overlay canvases ────────────────────────────────

    var hud = null, hctx = null, sctx = null, dpr = 1, VW = 0, VH = 0;
    var hudDirty = false;
    function makeCanvas(cls) {
      var c = doc.createElement('canvas');
      c.className = 'mrd-cv ' + cls;
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('data-meridian-ignore', '');
      doc.body.appendChild(c);
      return c;
    }
    function sizeCanvases() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      VW = window.innerWidth; VH = window.innerHeight;
      [hud].forEach(function (c) {
        if (!c) return;
        c.width = Math.round(VW * dpr); c.height = Math.round(VH * dpr);
        c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
      });
      hudDirty = false;
    }
    if (o.hud || o.reticle || o.ruler || o.streaks) { hud = makeCanvas('mrd-hud'); hctx = hud.getContext('2d'); }
    if (o.streaks) sctx = hctx;
    sizeCanvases();

    var patterns = {};
    function scanPattern(pal) {
      var id = pal.id;
      if (!patterns[id]) {
        var pc = doc.createElement('canvas');
        pc.width = 2; pc.height = 4;
        var px = pc.getContext('2d');
        px.fillStyle = rgba(pal.a, 0.5); px.fillRect(0, 0, 2, 1);
        px.fillStyle = rgba(pal.a, 0.12); px.fillRect(0, 2, 1, 1);
        patterns[id] = hctx.createPattern(pc, 'repeat');
      }
      return patterns[id];
    }

    var MONO = '500 9.5px "Geist Mono", ui-monospace, monospace';

    function brackets(ctx, x, y, w, h, len, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      x = Math.round(x) + 0.5; y = Math.round(y) + 0.5; w = Math.round(w); h = Math.round(h);
      ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
      ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
      ctx.moveTo(x + w, y + h - len); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - len, y + h);
      ctx.moveTo(x + len, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - len);
      ctx.stroke();
    }

    function drawArrival(a, r, p, t) {
      var ctx = hctx, pal = a.pal;
      var x = r.left, y = r.top, w = r.width, h = r.height;
      if (y > VH || y + h < 0) return;
      var kind = a.kind;

      if (kind === 'line') {
        var cx = x + w / 2, half = (w / 2), glow = 1 - smoothstep(0.7, 1, p);
        ctx.fillStyle = rgba(pal.a, 0.9 * glow);
        ctx.fillRect(cx - half - 2, y + h / 2 - 1.5, 3, 3);
        ctx.fillRect(cx + half - 1, y + h / 2 - 1.5, 3, 3);
        return;
      }

      var s = scanOf(a, p);
      var lockIn = expoOut(clamp(p / 0.16, 0, 1));
      var fade = 1 - smoothstep(0.82, 1, p);
      var alpha = smoothstep(0, 0.06, p) * fade;
      if (alpha <= 0.01) return;
      var inflate = 4 + (1 - lockIn) * 22;
      var len = clamp(Math.min(w, h) * 0.14, 6, 18);
      brackets(ctx, x - inflate, y - inflate, w + inflate * 2, h + inflate * 2, len, rgba(pal.a, 0.85 * alpha));

      if (kind === 'cipher') return;

      if (s > 0.001 && s < 0.999) {
        var by = y + s * h;
        // unprinted region: scanlines
        ctx.globalAlpha = 0.55 * alpha;
        ctx.fillStyle = scanPattern(pal);
        ctx.fillRect(x, by, w, y + h - by);
        ctx.globalAlpha = 1;
        // afterglow above the beam
        var g = ctx.createLinearGradient(0, by - 40, 0, by);
        g.addColorStop(0, rgba(pal.a, 0));
        g.addColorStop(1, rgba(pal.a, 0.2 * alpha));
        ctx.fillStyle = g;
        ctx.fillRect(x, Math.max(y, by - 40), w, Math.min(40, by - y));
        // the beam, with a chromatic ghost
        ctx.fillStyle = rgba(pal.b, 0.55 * alpha);
        ctx.fillRect(x, by + 1.5, w, 1);
        ctx.fillStyle = rgba(pal.a, 0.95 * alpha);
        ctx.fillRect(x - 10, by - 0.5, w + 20, 1);
        ctx.fillRect(x - 13, by - 1.5, 3, 3);
        ctx.fillRect(x + w + 10, by - 1.5, 3, 3);
        if ((kind === 'media' || kind === 'card') && w > 140 && h > 80) {
          ctx.font = MONO;
          ctx.textAlign = 'right';
          ctx.fillStyle = rgba(pal.a, 0.9 * alpha);
          ctx.fillText(String(Math.round(s * 100)).padStart(3, '0'), x + w - 6, by - 6);
        }
      }
    }

    // autofocus reticle
    var ret = { x: 0, y: 0, w: 0, h: 0, alpha: 0, target: null, lockT: 0, pal: PALS[0], label: '' };
    function labelFor(a, r) {
      var tag = a.el.tagName.toUpperCase();
      if (a.kind === 'media') {
        var m = /^(IMG|VIDEO|CANVAS|IFRAME)$/.test(tag) ? a.el : a.el.querySelector('img,video,canvas,iframe');
        var nm = m ? m.tagName.toUpperCase() : tag;
        var nw = m && (m.naturalWidth || m.videoWidth || m.width) || Math.round(r.width);
        var nh = m && (m.naturalHeight || m.videoHeight || m.height) || Math.round(r.height);
        return nm + '  ' + nw + '×' + nh;
      }
      if (a.kind === 'cipher') return tag + '  ' + (a.el.textContent || '').trim().split(/\s+/).length + ' WORDS';
      return tag + '  ' + Math.round(r.width) + '×' + Math.round(r.height);
    }

    function updateReticle(list, rects, dt, t) {
      if (!o.reticle || !hctx) return false;
      var calm = Math.abs(vel) < 120 && !glide.active;
      var best = null, bestR = null, bestD = 1e9;
      if (calm) {
        for (var i = 0; i < list.length; i++) {
          var a = list[i];
          if (!a.revealed || !(a.kind === 'media' || a.kind === 'card' || a.kind === 'cipher')) continue;
          var r = rects[i];
          if (r.height > VH * 0.75 || r.width < 40 || r.top < 0 || r.bottom > VH) continue;
          var dd = Math.abs((r.top + r.bottom) / 2 - VH / 2);
          if (dd < VH * 0.3 && dd < bestD) { best = a; bestR = r; bestD = dd; }
        }
      }
      if (best !== ret.target) {
        if (best) {
          ret.lockT = t;
          ret.pal = best.pal;
          ret.label = labelFor(best, bestR);
          if (ret.alpha < 0.05) { ret.x = bestR.left - 30; ret.y = bestR.top - 30; ret.w = bestR.width + 60; ret.h = bestR.height + 60; }
        }
        ret.target = best;
      }
      var showFor = 2600;
      var want = ret.target && (t - ret.lockT) < showFor ? 1 : 0;
      ret.alpha += (want - ret.alpha) * (1 - Math.exp(-dt * (want ? 9 : 5)));
      if (ret.target && bestR) {
        var kk = 1 - Math.exp(-dt * 13), pad = 9;
        ret.x += (bestR.left - pad - ret.x) * kk;
        ret.y += (bestR.top - pad - ret.y) * kk;
        ret.w += (bestR.width + pad * 2 - ret.w) * kk;
        ret.h += (bestR.height + pad * 2 - ret.h) * kk;
      }
      if (ret.alpha > 0.01) {
        var ctx = hctx, pal = ret.pal;
        var since = t - ret.lockT;
        var blink = since < 420 ? (((since / 70) | 0) % 2 ? 0.35 : 1) : 1;
        var al = ret.alpha * blink;
        var len = clamp(Math.min(ret.w, ret.h) * 0.1, 8, 22);
        brackets(ctx, ret.x, ret.y, ret.w, ret.h, len, rgba(pal.a, 0.9 * al));
        // centre ticks on each side
        ctx.fillStyle = rgba(pal.a, 0.7 * al);
        ctx.fillRect(Math.round(ret.x - 4), Math.round(ret.y + ret.h / 2), 7, 1);
        ctx.fillRect(Math.round(ret.x + ret.w - 3), Math.round(ret.y + ret.h / 2), 7, 1);
        // label, typed out
        ctx.font = MONO;
        ctx.textAlign = 'left';
        var chars = Math.min(ret.label.length, Math.floor(Math.max(0, since - 120) / 22));
        var txt = ret.label.slice(0, chars) + (chars < ret.label.length ? '_' : '');
        ctx.fillStyle = rgba(pal.a, 0.95 * al);
        ctx.fillText(txt, Math.round(ret.x), Math.round(ret.y - 7));
        hudDirty = true;
      }
      return ret.alpha > 0.01 || want === 1;
    }

    // tape ruler
    var tape = { alpha: 0, lastActive: 0, pal: PALS[1] };
    function updateRuler(dt, t, pos, max) {
      if (!o.ruler || !hctx || max <= 0) return false;
      if (Math.abs(vel) > 6 || glide.active) tape.lastActive = t;
      var want = t - tape.lastActive < 900 ? 1 : 0;
      tape.alpha += (want - tape.alpha) * (1 - Math.exp(-dt * (want ? 10 : 4)));
      if (tape.alpha < 0.01) return want === 1;
      var ctx = hctx, pal = tape.pal, al = tape.alpha;
      var H = Math.min(VH * 0.42, 340), cy = VH / 2, x = VW - 16;
      var spacing = 8, off = (pos * 0.1) % (spacing * 5);
      ctx.font = MONO;
      for (var yy = -H / 2 - spacing * 5; yy < H / 2 + spacing * 5; yy += spacing) {
        var ly = cy + yy - off;
        var dist = Math.abs(ly - cy) / (H / 2);
        if (dist > 1) continue;
        var idx = Math.round((yy + H) / spacing);
        var major = idx % 5 === 0;
        var fadeA = (1 - dist * dist) * al;
        ctx.fillStyle = rgba(pal.a, (major ? 0.75 : 0.35) * fadeA);
        ctx.fillRect(x - (major ? 9 : 4), Math.round(ly), major ? 9 : 4, 1);
      }
      // caret: grows with speed
      var sp = clamp(Math.abs(vel) / 3000, 0, 1);
      ctx.fillStyle = rgba(pal.b, 0.9 * al);
      ctx.fillRect(x - 16 - sp * 40, Math.round(cy), 16 + sp * 40, 1);
      ctx.beginPath();
      ctx.moveTo(x - 18 - sp * 40, cy - 3.5); ctx.lineTo(x - 13 - sp * 40, cy + 0.5); ctx.lineTo(x - 18 - sp * 40, cy + 4.5);
      ctx.fill();
      ctx.textAlign = 'right';
      ctx.fillStyle = rgba(pal.a, 0.95 * al);
      ctx.fillText(String(Math.round(clamp(pos / max, 0, 1) * 100)).padStart(3, '0'), x - 24 - sp * 40, cy - 6);
      ctx.fillStyle = rgba(pal.a, 0.55 * al);
      ctx.fillText(Math.round(Math.abs(vel)) + ' PX/S', x - 24 - sp * 40, cy + 14);
      hudDirty = true;
      return true;
    }

    // negative-space streaks
    var stars = [], spal = PALS[2];
    function seedStars() {
      stars = [];
      var n = Math.round(clamp(VW * VH / 16000, 30, 110));
      for (var i = 0; i < n; i++) stars.push({ x: Math.random() * VW, y: Math.random() * VH, z: 0.25 + Math.random() * 0.75 });
    }
    seedStars();
    function updateStreaks(dt, rects) {
      if (!sctx || !o.streaks) return false;
      var speed = Math.abs(vel);
      var intensity = clamp((speed - 280) / 2600, 0, 1);
      var span = VH + 200;
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        st.y -= vel * dt * (0.35 + st.z * 0.5);
        if (st.y < -100) { st.y += span; st.x = Math.random() * VW; }
        else if (st.y > VH + 100) { st.y -= span; st.x = Math.random() * VW; }
      }
      if (intensity <= 0) return false;
      var dir = vel > 0 ? 1 : -1;
      sctx.lineCap = 'round';
      for (i = 0; i < stars.length; i++) {
        st = stars[i];
        var len = clamp(speed * 0.03 * st.z, 3, 170);
        var my = st.y + dir * len / 2;
        var hit = false;
        for (var j = 0; j < rects.length; j++) {
          var r = rects[j];
          if (st.x > r.left - 8 && st.x < r.right + 8 && my > r.top - 8 && my < r.bottom + 8) { hit = true; break; }
        }
        if (hit) continue;
        var g = sctx.createLinearGradient(st.x, st.y, st.x, st.y + dir * len);
        g.addColorStop(0, rgba(spal.a, 0.8 * intensity * st.z));
        g.addColorStop(1, rgba(spal.a, 0));
        sctx.strokeStyle = g;
        sctx.lineWidth = 0.6 + st.z * 0.9;
        sctx.beginPath(); sctx.moveTo(st.x, st.y); sctx.lineTo(st.x, st.y + dir * len); sctx.stroke();
      }
      hudDirty = true;
      return true;
    }

    // ── adaptive quality: shed the costliest effects on devices that can't keep up ──
    var slowFrames = 0, quality = 3;
    function adaptQuality(dt, moving) {
      if (!moving || quality === 0 || doc.visibilityState !== 'visible' || Math.abs(vel) < 200) return;
      if (dt > 0.026) slowFrames++;
      else slowFrames = Math.max(0, slowFrames - 0.5);
      if (slowFrames > 24) {
        slowFrames = 0;
        if (quality === 3) o.chroma = 0;
        else if (quality === 2) o.streaks = false;
        else if (quality === 1) o.warp = 0;
        quality--;
      }
    }

    // ── the frame loop ──────────────────────────────────

    var STIFF = 150, DAMP = 2 * Math.sqrt(150) * 0.62;
    var WSTIFF = 70, WDAMP = 2 * Math.sqrt(70) * 0.55;

    function kick() {
      if (destroyed || raf) return;
      raf = requestAnimationFrame(frame);
    }

    function frame(t) {
      raf = 0;
      frameNo++;
      var dt = idle ? 1 / 60 : clamp((t - lastT) / 1000, 1 / 240, 1 / 20);
      lastT = t;
      idle = false;
      var busy = false;

      // 1. inertial scroll
      if (glide.active) {
        var actual = Math.round(window.scrollY);
        if (Math.abs(actual - glide.written) > 2) glide.active = false;
        else {
          glide.current += (glide.target - glide.current) * (1 - Math.exp(-glide.rate * dt));
          if (Math.abs(glide.target - glide.current) < 0.3) { glide.current = glide.target; glide.active = false; }
          window.scrollTo({ top: glide.current, left: window.scrollX, behavior: 'instant' });
          glide.written = Math.round(window.scrollY);
          busy = glide.active;
        }
      }

      // 2. velocity and warp
      var pos = scrollPosOf(scroller);
      var raw = (pos - lastPos) / dt;
      lastPos = pos;
      vel += (raw - vel) * (1 - Math.exp(-dt / 0.075));
      if (Math.abs(vel) < 0.5 && raw === 0) vel = 0;
      if (Math.abs(vel) > 1) busy = true;
      var wTarget = clamp(Math.abs(vel) / 2400, 0, 1);
      warpVel += (WSTIFF * (wTarget - warpAmt) - WDAMP * warpVel) * dt;
      warpAmt += warpVel * dt;
      if (Math.abs(warpAmt - wTarget) > 0.002 || Math.abs(warpVel) > 0.01) busy = true;
      else { warpAmt = wTarget; warpVel = 0; }

      var vw = VW, vh = VH, half = vh / 2;
      var max = maxOf(scroller);
      var topRoom = clamp(pos / (vh * 0.35), 0, 1);
      var botRoom = clamp((max - pos) / (vh * 0.35), 0, 1);

      // 3. reads
      var list = [];
      visible.forEach(function (a) { list.push(a); });
      var rects = new Array(list.length);
      for (var i = 0; i < list.length; i++) rects[i] = list[i].el.getBoundingClientRect();

      // 4. arrivals, staggered in reading order
      // the faster you travel, the sooner and quicker things materialise
      var speedF = clamp(Math.abs(vel) / 1600, 0, 2);
      if (o.reveal) {
        var arriving = [];
        for (i = 0; i < list.length; i++) {
          var a0 = list[i];
          if (a0.revealed || a0.rStart >= 0) continue;
          var rr = rects[i];
          if (rr.width === 0 && rr.height === 0) continue;
          if (rr.bottom < 0) { a0.revealed = true; if (a0.chars) unsplit(a0); continue; }
          if (rr.top - a0.ty < vh * (o.threshold + 0.24 * Math.min(1, speedF))) arriving.push({ a: a0, r: rr });
        }
        if (arriving.length) {
          arriving.sort(function (p, q) {
            var dyy = p.r.top - q.r.top;
            return Math.abs(dyy) > 24 ? dyy : p.r.left - q.r.left;
          });
          var step = (firstFrame ? 110 : 70) / (1 + speedF * 2), cap = firstFrame ? 1500 : 420 / (1 + speedF);
          var quick = 1 / (1 + speedF * 1.4);
          for (i = 0; i < arriving.length; i++) {
            var ar = arriving[i].a;
            ar.rStart = t + Math.min(i * step, cap);
            ar.dur = (ar.kind === 'media' ? 1650 : ar.kind === 'card' ? 1300 : ar.kind === 'line' ? 1300 : ar.kind === 'fade' ? 700 : 1000) * quick;
            if (ar.chars) ar.msPerChar *= quick;
          }
          busy = true;
        }
      }
      firstFrame = false;

      if (hctx && hudDirty) { hctx.clearRect(0, 0, VW, VH); hudDirty = false; }

      // 5. writes + arrival graphics
      for (i = 0; i < list.length; i++) {
        var a = list[i], r = rects[i];
        if (r.width === 0 && r.height === 0) continue;

        var lh = r.height;
        var cy = (r.top + r.bottom) / 2 - a.ty;
        var cx = (r.left + r.right) / 2;
        var d = (cy - half) / half;
        var tall = lh > vh * 0.55 ? clamp(1 - (lh - vh * 0.55) / (vh * 0.5), 0, 1) : 1;

        var p = 1;
        if (!a.revealed) {
          busy = true;
          if (a.rStart < 0 || t < a.rStart) p = 0;
          else if (a.kind === 'cipher') {
            var done = stepCipher(a, t);
            p = done ? 1 : clamp((t - a.rStart) / (a.msPerChar * ((a.chars ? a.chars.length : 0) + WINDOW)), 0, 0.999);
            if (done) a.revealed = true;
          } else {
            p = clamp((t - a.rStart) / (a.dur || 1000), 0, 1);
            if (p >= 1) a.revealed = true;
          }
          if (hctx && o.hud && p > 0 && p < 1) { drawArrival(a, r, p, t); hudDirty = true; }
        }

        var target = 0;
        if (o.silk > 0 && (a.moveT || a.moveI)) {
          var weight = 0.22 + 0.62 * Math.min(Math.abs(d), 1.4) + 0.2 * clamp(cx / vw, 0, 1);
          target = clamp(vel * 0.0105 * o.silk * weight, -70, 70) * (0.25 + 0.75 * tall);
        }
        a.vy += (STIFF * (target - a.y) - DAMP * a.vy) * dt;
        a.y += a.vy * dt;
        if (Math.abs(a.y - target) < 0.02 && Math.abs(a.vy) < 0.2) { a.y = target; a.vy = 0; }
        else busy = true;

        var dop = 1;
        if (o.depth > 0) {
          var edge = smoothstep(0.55, 1.1, Math.abs(d)) * (d < 0 ? topRoom : botRoom) * o.depth * tall;
          dop = 1 - 0.38 * edge;
        }
        applyState(a, p, a.y, d, dop, t, tall);
      }

      // 6. overlay graphics
      if (updateReticle(list, rects, dt, t)) busy = true;
      if (updateRuler(dt, t, pos, max)) busy = true;
      if (updateStreaks(dt, rects)) busy = true;
      adaptQuality(dt, busy);

      if (busy) raf = requestAnimationFrame(frame);
      else {
        idle = true;
        if (hctx && hudDirty) { hctx.clearRect(0, 0, VW, VH); hudDirty = false; }
      }
    }

    function onResize() {
      atoms.forEach(function (a) { a.size = null; a.innerH = 0; });
      sizeCanvases();
      seedStars();
      kick();
    }

    // ── dynamic content ─────────────────────────────────

    var mo = null, rescanTimer = 0, lastRescan = 0;
    function scheduleRescan(soon) {
      if (rescanTimer || destroyed) return;
      var wait = Math.max(120, (soon ? 300 : 1200) - (now() - lastRescan));
      rescanTimer = setTimeout(function () {
        rescanTimer = 0;
        var run = function () { lastRescan = now(); rescan(); };
        if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 600 });
        else run();
      }, wait);
    }
    function rescan() {
      if (destroyed) return;
      for (var i = atoms.length - 1; i >= 0; i--) {
        if (!atoms[i].el.isConnected) { unregister(atoms[i]); atoms.splice(i, 1); }
      }
      scan().forEach(function (spec) { register(spec, false); });
      kick();
    }
    if ('MutationObserver' in window) {
      mo = new MutationObserver(function (records) {
        var soon = false, any = false;
        for (var i = 0; i < records.length; i++) {
          var rec = records[i], tg = rec.target;
          if (tg.nodeType === 1 && tg.closest('[data-mrd-split],.mrd-cv')) continue;
          if (rec.type === 'childList') {
            var ours = rec.removedNodes.length === 0;
            for (var j = 0; j < rec.addedNodes.length && ours; j++) {
              var n = rec.addedNodes[j];
              ours = n.nodeType === 1 && n.classList.contains('mrd-cv');
            }
            if (ours) continue;
            soon = true;
          }
          any = true;
        }
        if (any) scheduleRescan(soon);
      });
    }

    // ── start ───────────────────────────────────────────

    scan().forEach(function (spec) { register(spec, false); });
    var vh0 = window.innerHeight;
    atoms.forEach(function (a) {
      var r = a.el.getBoundingClientRect();
      if (r.bottom > -vh0 * 0.2 && r.top < vh0 * 1.2 && r.width + r.height > 0) {
        visible.add(a); a.el.setAttribute('data-mrd-live', '');
      }
    });
    if (mo) mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open'] });

    function listen(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      cleanups.push(function () { target.removeEventListener(type, fn, opts); });
    }
    listen(window, 'wheel', onWheel, { passive: false });
    listen(window, 'keydown', onKey, false);
    listen(doc, 'click', onClick, false);
    listen(doc, 'scroll', onScroll, { passive: true, capture: true });
    listen(window, 'resize', onResize, { passive: true });
    listen(window, 'load', function () { atoms.forEach(function (a) { a.size = null; a.innerH = 0; }); kick(); }, false);
    if (reducedQuery && reducedQuery.addEventListener) {
      listen(reducedQuery, 'change', function () { api.destroy(); Meridian.init(userOpts); }, false);
    }

    html.classList.remove('mrd-boot');
    html.classList.add('mrd-on');
    kick();

    var api = {
      version: VERSION,
      options: o,
      scrollTo: function (target, opts) {
        var rate = (opts && opts.rate) || 5;
        if (typeof target === 'number') return glideTo(target, rate);
        var el = typeof target === 'string' ? doc.querySelector(target) : target;
        if (el) glideTo(anchorTargetY(el) - ((opts && opts.offset) || 0), rate);
      },
      refresh: function () { rescan(); },
      get velocity() { return vel; },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        if (raf) cancelAnimationFrame(raf);
        if (rescanTimer) clearTimeout(rescanTimer);
        if (mo) mo.disconnect();
        if (io) io.disconnect();
        atoms.forEach(unregister);
        atoms.length = 0;
        if (hud) hud.remove();
        cleanups.forEach(function (fn) { fn(); });
        html.classList.remove('mrd-on', 'mrd-boot');
        if (instance === api) instance = null;
      }
    };
    return api;
  }

  // ───────────────────────────────────────── public surface

  var instance = null;
  var Meridian = {
    version: VERSION,
    defaults: DEFAULTS,
    init: function (opts) {
      if (instance) instance.destroy();
      var start = function () { instance = create(opts); return instance; };
      if (!doc.body) {
        return new Promise(function (res) { doc.addEventListener('DOMContentLoaded', function () { res(start()); }, { once: true }); });
      }
      return start();
    },
    get instance() { return instance; }
  };

  return Meridian;
})();

export default Meridian;
