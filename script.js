(() => {
  const root = document.documentElement;
  const body = document.body;
  const toggle = document.getElementById('themeToggle');
  const stored = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

  if (stored === 'light' || stored === 'dark') {
    root.setAttribute('data-theme', stored);
  } else {
    root.setAttribute('data-theme', prefersLight ? 'light' : 'dark');
  }

  /* Legacy Safari / some in-app browsers: MQL has addListener, not addEventListener — a throw here aborts the whole script (mobile intro never finishes). */
  const colorSchemeMql = window.matchMedia('(prefers-color-scheme: light)');
  function syncThemeFromSystem() {
    if (localStorage.getItem('theme') !== 'light' && localStorage.getItem('theme') !== 'dark') {
      root.setAttribute('data-theme', colorSchemeMql.matches ? 'light' : 'dark');
    }
  }
  if (typeof colorSchemeMql.addEventListener === 'function') {
    colorSchemeMql.addEventListener('change', syncThemeFromSystem);
  } else if (typeof colorSchemeMql.addListener === 'function') {
    colorSchemeMql.addListener(syncThemeFromSystem);
  }

  function trackEvent(name, data) {
    try {
      var tracker = window.umami;
      if (tracker && typeof tracker.track === 'function') {
        tracker.track(name, data);
      }
    } catch (err) {}
  }

  function getCarouselCardTitle(card) {
    if (!card) return '';
    var title = card.querySelector('.bento-card-title');
    return title ? title.textContent.trim().replace(/\s+/g, ' ') : '';
  }

  function getCarouselCardId(card) {
    if (!card) return 'unknown';
    if (card.dataset.sideProject) return card.dataset.sideProject;

    var title = getCarouselCardTitle(card);
    if (!title) return 'unknown';

    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function getCarouselSection(card) {
    var carousel = card && card.closest('.carousel');
    if (!carousel) return 'unknown';
    if (carousel.id === 'workCarousel') return 'selected-work';
    if (carousel.id === 'sideProjectsCarousel') return 'side-projects';
    return carousel.id || 'unknown';
  }

  function trackCarouselCardHover(card) {
    if (!card || card.closest('.carousel-slide--clone')) return;

    trackEvent('carousel-card-hover', {
      id: getCarouselCardId(card),
      section: getCarouselSection(card),
      title: getCarouselCardTitle(card)
    });
  }

  function getEmailClickLocation(link) {
    if (link.classList.contains('main-blurb-availability')) return 'blurb';
    if (link.classList.contains('call-message-email')) return 'call-overlay';
    if (link.classList.contains('header-email-fab')) return 'header';
    if (link.closest('.fab-nav')) return 'fab-nav';
    if (link.closest('.sidebar-nav')) return 'sidebar';
    return 'other';
  }

  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href^="mailto:"]');
    if (!link) return;
    if (link.classList.contains('header-email-fab')) {
      trackEvent('header-email-click', { location: 'header' });
    }
    trackEvent('email-click', { location: getEmailClickLocation(link) });
  });

  (function initHeaderEmailHoverTracking() {
    var headerEmail = document.querySelector('.header-email-fab');
    if (!headerEmail) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    headerEmail.addEventListener('mouseenter', function() {
      trackEvent('header-email-hover', { location: 'header' });
    }, { passive: true });
  })();

  /* ----- Main blurb word-by-word reveal (runs early so a later error never blocks transition to full site) ----- */
  const mqMobileIntro = window.matchMedia('(max-width: 768px)');
  const reduceMotionIntro = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function introRevealLayoutReady() {
    return root.classList.contains('blurb-reveal-done') || root.classList.contains('site-reveal-prep');
  }

  function finishMobileIntro() {
    root.classList.add('mobile-intro-done');
    if (mqMobileIntro.matches) {
      // One targeted layout pass after the fade — not a synthetic resize, which
      // fans out into carousel relayout, phone-scroll, footer fit, etc.
      setTimeout(runPostIntroLayoutPass, 1250);
      return;
    }
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        dispatchPortfolioLayout({ pass: 'post-intro' });
      });
    });
    setTimeout(function() {
      dispatchPortfolioLayout({ pass: 'settle' });
    }, 2600);
  }

  function finishBlurbReveal() {
    if (root.classList.contains('blurb-reveal-done')) return;
    if (root.classList.contains('site-reveal-prep')) return;

    var isMobileIntro = mqMobileIntro.matches;

    // Mobile: mount content off-screen, settle layout, paint at opacity 0,
    // then start the fade on the next frame so layout + animation never share
    // a frame (the main source of jank on real devices vs desktop emulation).
    if (isMobileIntro && !reduceMotionIntro) {
      root.classList.add('site-reveal-prep');
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          root.classList.add('blurb-reveal-done');
          window.dispatchEvent(new Event('blurb-reveal-complete'));
          root.classList.remove('site-reveal-prep');
          requestAnimationFrame(function() {
            root.classList.add('site-reveal-animate');
            setTimeout(finishMobileIntro, 1040);
          });
        });
      });
      return;
    }

    var prepDuration = reduceMotionIntro ? 0 : 520;
    if (prepDuration > 0) {
      root.classList.add('site-reveal-prep');
    }

    setTimeout(function() {
      root.classList.add('blurb-reveal-done');
      root.classList.remove('site-reveal-prep');
      // Dispatch synchronously so listeners settle the carousel (position +
      // equalized card heights) in this same frame, before the browser paints
      // the first frame of the content-reveal fade. That way the fade plays
      // over already-settled content instead of revealing a layout that then
      // jumps into place mid-animation.
      window.dispatchEvent(new Event('blurb-reveal-complete'));

      var chromeDelay = reduceMotionIntro ? 0 : 220;
      setTimeout(finishMobileIntro, chromeDelay);
    }, prepDuration);
  }

  const blurbEl = document.querySelector('.main-blurb');
  const availabilityEl = document.querySelector('.main-blurb-availability');
  const availabilityTextEl = availabilityEl ? availabilityEl.querySelector('.main-blurb-availability-text') : null;
  if (blurbEl) {
    const source = blurbEl.innerHTML;
    const availabilitySource = availabilityTextEl ? availabilityTextEl.innerHTML || '' : '';
    const WORD_DELAY = 132;
    const AVAILABILITY_DELAY = 112;

    function buildRevealWords(targetEl, sourceMarkup) {
      if (!targetEl) return [];

      targetEl.innerHTML = '';
      const template = document.createElement('template');
      template.innerHTML = sourceMarkup;
      const words = [];
      let pendingSpace = false;

      function appendPendingSpace() {
        if (!pendingSpace) return;
        if (targetEl.lastChild && targetEl.lastChild.nodeName !== 'BR') {
          targetEl.appendChild(document.createTextNode(' '));
        }
        pendingSpace = false;
      }

      function appendRevealWord(text) {
        if (!text) return;
        appendPendingSpace();
        const wordEl = document.createElement('span');
        wordEl.className = 'reveal-word';
        wordEl.textContent = text;
        targetEl.appendChild(wordEl);
        words.push(wordEl);
      }

      function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const segments = node.textContent.split(/(\s+)/);
          segments.forEach(function(segment) {
            if (!segment) return;
            if (/^\s+$/.test(segment)) {
              pendingSpace = !!targetEl.lastChild && targetEl.lastChild.nodeName !== 'BR';
              return;
            }
            appendRevealWord(segment);
          });
          return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;

        if (node.tagName === 'BR') {
          pendingSpace = false;
          targetEl.appendChild(document.createElement('br'));
          return;
        }

        if (node.classList.contains('main-blurb-break')) {
          pendingSpace = false;
          targetEl.appendChild(node.cloneNode(true));
          return;
        }

        if (node.classList.contains('blurb-name-cursor')) {
          appendPendingSpace();
          const nameEl = node.cloneNode(true);
          nameEl.classList.add('reveal-word');
          targetEl.appendChild(nameEl);
          words.push(nameEl);
          return;
        }

        if (node.classList.contains('blurb-wave')) {
          appendPendingSpace();
          const waveEl = node.cloneNode(true);
          waveEl.classList.add('reveal-word');
          targetEl.appendChild(waveEl);
          words.push(waveEl);
          return;
        }

        if (node.classList.contains('blurb-brand-word')) {
          appendPendingSpace();
          const brandEl = node.cloneNode(true);
          brandEl.classList.add('reveal-word');
          targetEl.appendChild(brandEl);
          words.push(brandEl);
          return;
        }

        if (node.classList.contains('main-blurb-availability-contact')) {
          appendPendingSpace();
          const contactEl = node.cloneNode(true);
          contactEl.classList.add('reveal-word');
          targetEl.appendChild(contactEl);
          words.push(contactEl);
          return;
        }

        Array.from(node.childNodes).forEach(processNode);
      }

      Array.from(template.content.childNodes).forEach(processNode);

      return words;
    }

    function revealWords(wordEls, delay, onComplete, onWordVisible) {
      if (!wordEls.length) {
        if (onComplete) onComplete();
        return;
      }

      var wordIndex = 0;

      function revealNextWord() {
        if (wordIndex >= wordEls.length) {
          if (onComplete) onComplete();
          return;
        }

        var currentWordIndex = wordIndex;
        var currentWord = wordEls[currentWordIndex];
        requestAnimationFrame(function() {
          currentWord.classList.add('is-visible');
          currentWord.addEventListener('transitionend', function onRevealWordSettled(e) {
            if (e.target !== currentWord) return;
            if (e.propertyName !== 'opacity' && e.propertyName !== 'transform') return;
            currentWord.removeEventListener('transitionend', onRevealWordSettled);
            currentWord.classList.add('is-settled');
          });
          if (onWordVisible) onWordVisible(currentWord, currentWordIndex);
        });

        wordIndex += 1;
        setTimeout(revealNextWord, delay);
      }

      revealNextWord();
    }

    const blurbWords = buildRevealWords(blurbEl, source);
    const availabilityWords = availabilityTextEl ? buildRevealWords(availabilityTextEl, availabilitySource) : [];

    if (availabilityEl) {
      availabilityEl.classList.remove('is-revealing');
      availabilityEl.classList.remove('is-visible');
    }
    blurbEl.classList.remove('main-blurb--loading');
    blurbEl.classList.add('main-blurb--revealing');

    function scheduleSiteReveal() {
      blurbEl.classList.remove('main-blurb--revealing');
      var contentPause = reduceMotionIntro ? 0 : (mqMobileIntro.matches ? 160 : 280);
      setTimeout(finishBlurbReveal, contentPause);
    }

    function revealAvailability() {
      if (!availabilityEl || !availabilityTextEl || !availabilitySource) {
        scheduleSiteReveal();
        return;
      }

      availabilityEl.classList.add('is-revealing');
      revealWords(
        availabilityWords,
        AVAILABILITY_DELAY,
        function() {
          availabilityEl.classList.add('is-visible');
          scheduleSiteReveal();
        }
      );
    }

    revealWords(blurbWords, WORD_DELAY, function() {
      setTimeout(revealAvailability, 120);
    });
  } else {
    finishBlurbReveal();
  }

  if (toggle) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = root.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  const logoFlip = document.getElementById('logoFlip');
  if (logoFlip) {
    const toggleFlip = () => logoFlip.classList.toggle('flipped');
    logoFlip.addEventListener('click', (e) => {
      e.preventDefault();
      toggleFlip();
    });
    logoFlip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFlip();
      }
    });
  }

  /* ----- Mobile nav drawer (burger) ----- */
  const navBurger = document.getElementById('navBurger');
  const navBackdrop = document.getElementById('navBackdrop');
  const sidebarNav = document.getElementById('sidebarNav');
  let navBackdropHideTimer = null;

  function bindNavDrawer(options) {
    var burger = options.burger;
    var backdrop = options.backdrop;
    var panel = options.panel;
    var openClass = options.openClass;
    var backdropTimer = options.backdropTimer || { id: null };
    var closeAbove = options.closeAbove || 1024;

    if (!burger || !panel) return;

    function setDrawerOpen(open) {
      if (open) {
        clearTimeout(backdropTimer.id);
        if (backdrop) {
          backdrop.hidden = false;
          backdrop.setAttribute('aria-hidden', 'false');
        }
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            root.classList.add(openClass);
          });
        });
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'Close menu');
      } else {
        root.classList.remove(openClass);
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Open menu');
        if (backdrop) {
          clearTimeout(backdropTimer.id);
          backdropTimer.id = setTimeout(function() {
            backdrop.hidden = true;
            backdrop.setAttribute('aria-hidden', 'true');
          }, 380);
        }
      }
    }

    burger.addEventListener('click', function() {
      setDrawerOpen(!root.classList.contains(openClass));
    });

    if (backdrop) {
      backdrop.addEventListener('click', function() {
        setDrawerOpen(false);
      });
    }

    panel.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        setDrawerOpen(false);
      });
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && root.classList.contains(openClass)) {
        setDrawerOpen(false);
      }
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth > closeAbove) setDrawerOpen(false);
    });
  }

  if (navBurger && sidebarNav) {
    bindNavDrawer({
      burger: navBurger,
      backdrop: navBackdrop,
      panel: sidebarNav,
      openClass: 'nav-menu-open',
      backdropTimer: { id: navBackdropHideTimer },
      closeAbove: 768
    });
  }

  const brands = {
    square:    { bg: '#000000', card: '#111111', text: '#ffffff', sub: '#aaaaaa', muted: '#666666', border: 'rgba(255,255,255,0.1)', tag: 'rgba(255,255,255,0.08)', placeholder: '#1a1a1a', placeholderText: '#444444' },
    block:     { bg: '#000000', card: '#111111', text: '#ffffff', sub: '#aaaaaa', muted: '#666666', border: 'rgba(255,255,255,0.1)', tag: 'rgba(255,255,255,0.08)', placeholder: '#1a1a1a', placeholderText: '#444444' },
    cash:      { bg: '#00D54B', card: '#00b840', text: '#ffffff', sub: '#d4fce4', muted: '#a0e8b8', border: 'rgba(255,255,255,0.2)', tag: 'rgba(255,255,255,0.15)', placeholder: '#00c043', placeholderText: 'rgba(255,255,255,0.3)' },
    cashapp:   { bg: '#00D54B', card: '#00b840', text: '#ffffff', sub: '#d4fce4', muted: '#a0e8b8', border: 'rgba(255,255,255,0.2)', tag: 'rgba(255,255,255,0.15)', placeholder: '#00c043', placeholderText: 'rgba(255,255,255,0.3)' },
    meta:      { bg: '#0866FF', card: '#0055dd', text: '#ffffff', sub: '#b8d4ff', muted: '#80b0ff', border: 'rgba(255,255,255,0.2)', tag: 'rgba(255,255,255,0.15)', placeholder: '#0058cc', placeholderText: 'rgba(255,255,255,0.3)' },
    instagram: { bg: '#E1306C', gradient: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)', card: '#c42860', text: '#ffffff', sub: '#ffd6e4', muted: '#ffacc8', border: 'rgba(255,255,255,0.2)', tag: 'rgba(255,255,255,0.15)', placeholder: '#b82558', placeholderText: 'rgba(255,255,255,0.3)' },
    facebook:  { bg: '#1877F2', card: '#1266d4', text: '#ffffff', sub: '#b0d0ff', muted: '#78b0ff', border: 'rgba(255,255,255,0.2)', tag: 'rgba(255,255,255,0.15)', placeholder: '#1060c0', placeholderText: 'rgba(255,255,255,0.3)' },
    ogilvy:    { bg: '#E41C38', card: '#c8162f', text: '#ffffff', sub: '#ffccd4', muted: '#ff8898', border: 'rgba(255,255,255,0.2)', tag: 'rgba(255,255,255,0.15)', placeholder: '#b8152c', placeholderText: 'rgba(255,255,255,0.3)' },
    drover:    { bg: '#2F6BFF', card: '#2558dd', text: '#ffffff', sub: '#b8d0ff', muted: '#80a8ff', border: 'rgba(255,255,255,0.2)', tag: 'rgba(255,255,255,0.15)', placeholder: '#2250cc', placeholderText: 'rgba(255,255,255,0.3)' },
    skimlinks: { bg: '#6F2C91', card: '#5e2580', text: '#ffffff', sub: '#dbb8ef', muted: '#b880d8', border: 'rgba(255,255,255,0.2)', tag: 'rgba(255,255,255,0.15)', placeholder: '#552070', placeholderText: 'rgba(255,255,255,0.3)' },
  };

  let brandTimeout;

  function applyBrand(brand) {
    clearTimeout(brandTimeout);
    const b = brands[brand];
    if (!b) return;

    body.classList.add('brand-active');

    if (b.gradient) {
      body.style.background = b.gradient;
    } else {
      body.style.background = b.bg;
    }
    root.style.setProperty('--bg-primary', b.bg);
    root.style.setProperty('--bg-card', b.card);
    root.style.setProperty('--bg-card-hover', b.card);
    root.style.setProperty('--text-primary', b.text);
    root.style.setProperty('--text-secondary', b.sub);
    root.style.setProperty('--text-tertiary', b.muted);
    root.style.setProperty('--border-primary', b.border);
    root.style.setProperty('--bg-tag', b.tag);
    root.style.setProperty('--placeholder-bg', b.placeholder);
    root.style.setProperty('--placeholder-text', b.placeholderText);
    root.style.setProperty('--marquee-text', 'rgba(255, 255, 255, 0.35)');

    document.querySelectorAll('.marquee-logo').forEach(img => {
      img.style.filter = 'invert(1)';
      img.style.opacity = '0.6';
    });
    requestAnimationFrame(function() {
      if (typeof updateSiteHeaderTone === 'function') updateSiteHeaderTone();
    });
  }

  function clearBrandNow() {
    clearTimeout(brandTimeout);
    body.classList.remove('brand-active');
    body.style.background = '';

    const overrides = ['--bg-primary','--bg-card','--bg-card-hover','--text-primary','--text-secondary','--text-tertiary','--border-primary','--bg-tag','--placeholder-bg','--placeholder-text','--marquee-text'];
    overrides.forEach(prop => root.style.removeProperty(prop));

    document.querySelectorAll('.marquee-logo').forEach(img => {
      img.style.filter = '';
      img.style.opacity = '';
    });
    var header = document.querySelector('.site-header');
    if (header) header.classList.remove('site-header--on-dark');
    scheduleSiteHeaderToneRefresh();
  }

  function removeBrand() {
    brandTimeout = setTimeout(clearBrandNow, 80);
  }

  var touchBrandStart = { x: 0, y: 0, t: 0, brand: null };
  var touchDidMove = false;

  function bindBrandHover(item) {
    if (!item || item.dataset.brandHoverBound === 'true') return;
    if (item.closest('.experience')) return;

    item.dataset.brandHoverBound = 'true';
    item.addEventListener('mouseenter', () => applyBrand(item.dataset.brand));
    item.addEventListener('mouseleave', removeBrand);
    item.addEventListener('touchstart', (e) => {
      if (item.classList.contains('marquee-item')) e.preventDefault();
      touchBrandStart.x = e.touches[0].clientX;
      touchBrandStart.y = e.touches[0].clientY;
      touchBrandStart.t = Date.now();
      touchBrandStart.brand = item.dataset.brand;
      touchDidMove = false;
    }, { passive: false });
    item.addEventListener('touchmove', () => { touchDidMove = true; }, { passive: true });
    item.addEventListener('touchend', (e) => {
      if (touchDidMove || !touchBrandStart.brand) return;
      var dt = Date.now() - touchBrandStart.t;
      var dx = e.changedTouches[0].clientX - touchBrandStart.x;
      var dy = e.changedTouches[0].clientY - touchBrandStart.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dt < 400 && dist < 20) {
        applyBrand(touchBrandStart.brand);
        setTimeout(removeBrand, 2000);
      }
      touchBrandStart.brand = null;
    }, { passive: true });
  }

  function bindBrandHovers(scope) {
    (scope || document).querySelectorAll('[data-brand]').forEach(function(item) {
      if (item.closest('.carousel-slide--clone')) return;
      if (item.closest('#workCarousel')) return;
      bindBrandHover(item);
    });
  }

  const canHoverFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var latestDocumentPointer = { x: null, y: null };

  function getCarouselCardFromPoint(carouselEl, x, y) {
    if (!carouselEl || x == null || y == null) return null;
    var elements = document.elementsFromPoint(x, y);
    var i = elements.length;
    while (i--) {
      var card = elements[i].closest('.carousel-slide .bento-card, .carousel-slide .side-project-card');
      if (card && carouselEl.contains(card)) return card;
    }
    return null;
  }

  function normalizeWheelDeltas(e, sizeEl) {
    var el = sizeEl || document.documentElement;
    var width = el.clientWidth || window.innerWidth;
    var height = el.clientHeight || window.innerHeight;
    var deltaX = e.deltaX;
    var deltaY = e.deltaY;
    if (e.deltaMode === 1) {
      deltaX *= 16;
      deltaY *= 16;
    } else if (e.deltaMode === 2) {
      deltaX *= width;
      deltaY *= height;
    }
    if (e.shiftKey && Math.abs(deltaY) > Math.abs(deltaX)) {
      deltaX = deltaY;
      deltaY = 0;
    }
    return { deltaX: deltaX, deltaY: deltaY };
  }

  function isHorizontalWheelIntent(deltaX, deltaY) {
    var absX = Math.abs(deltaX);
    var absY = Math.abs(deltaY);
    if (absX < 1) return false;
    if (absY < 1) return true;
    if (absX <= absY) return false;
    // Trackpad vertical scroll often leaks a small horizontal component.
    if (absY >= 4 && absX < 12) return false;
    return true;
  }

  var pointerHoverIntent = (function() {
    var intentActive = false;
    var suppressedUntil = 0;
    var lastX = null;
    var lastY = null;
    var SUPPRESS_MS = 520;
    var MOVE_THRESHOLD = 4;

    function clearCarouselHovers() {
      document.querySelectorAll('.carousel-viewport').forEach(function(vp) {
        if (typeof vp._clearCarouselHover === 'function') vp._clearCarouselHover();
      });
    }

    function suppress(ms) {
      intentActive = false;
      suppressedUntil = performance.now() + (ms || SUPPRESS_MS);
      root.classList.add('pointer-hover-suppressed');
      clearCarouselHovers();
    }

    function allow() {
      if (!intentActive || performance.now() < suppressedUntil) return false;
      root.classList.remove('pointer-hover-suppressed');
      return true;
    }

    function noteMove(e) {
      if (lastX !== null && lastY !== null) {
        var dx = e.clientX - lastX;
        var dy = e.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) >= MOVE_THRESHOLD) {
          intentActive = true;
        }
      }
      lastX = e.clientX;
      lastY = e.clientY;
      if (intentActive && performance.now() >= suppressedUntil) {
        root.classList.remove('pointer-hover-suppressed');
      }
    }

    if (canHoverFinePointer) {
      window.addEventListener('scroll', function() { suppress(); }, { passive: true });
      window.addEventListener('wheel', function() { suppress(); }, { passive: true, capture: true });
    }

    return { allow: allow, suppress: suppress, noteMove: noteMove };
  })();

  if (canHoverFinePointer) {
    document.addEventListener('mousemove', function(e) {
      latestDocumentPointer.x = e.clientX;
      latestDocumentPointer.y = e.clientY;
      pointerHoverIntent.noteMove(e);
    }, { passive: true });
  }

  function initCarouselPointerHover(carouselEl, vpEl, carouselState) {
    if (!canHoverFinePointer || !carouselEl || !vpEl) return;

    var activeCard = null;
    var activeSlide = null;
    var isWorkCarousel = carouselEl.id === 'workCarousel';
    var brandIntentCard = null;
    var brandScrollSuppressedUntil = 0;

    if (isWorkCarousel && !window.__workCarouselBrandScrollGuard) {
      window.__workCarouselBrandScrollGuard = true;
      window.addEventListener('scroll', function() {
        brandScrollSuppressedUntil = performance.now() + 280;
        brandIntentCard = null;
        clearBrandNow();
        pointerHoverIntent.suppress(280);
      }, { passive: true });
    }

    function markBrandIntent(card) {
      if (!card) return;
      brandIntentCard = card;
    }

    function canApplyBrandTheme(card) {
      if (!isWorkCarousel || !card || !card.dataset.brand) return false;
      if (performance.now() < brandScrollSuppressedUntil) return false;
      return brandIntentCard === card;
    }

    function applyBrandForCard(card) {
      if (!canApplyBrandTheme(card)) return;
      applyBrand(card.dataset.brand);
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function rememberPointer(x, y) {
      latestDocumentPointer.x = x;
      latestDocumentPointer.y = y;
    }

    function updateCaseStudyPill(card, x, y) {
      var pill = card.querySelector('.case-study-pill');
      if (!pill) return;
      var rect = card.getBoundingClientRect();
      var pillRect = pill.getBoundingClientRect();
      var localX = x - rect.left;
      var localY = y - rect.top;
      var gutter = 18;
      var minX = pillRect.width / 2 + gutter;
      var maxX = rect.width - pillRect.width / 2 - gutter;
      var minY = pillRect.height + gutter;
      var maxY = rect.height - gutter;
      card.style.setProperty('--case-study-pill-x', clamp(localX, minX, maxX) + 'px');
      card.style.setProperty('--case-study-pill-y', clamp(localY, minY, maxY) + 'px');
    }

    function getAllCards() {
      return carouselEl.querySelectorAll('.carousel-slide .bento-card, .carousel-slide .side-project-card');
    }

    function getCardFromPoint(x, y) {
      return getCarouselCardFromPoint(carouselEl, x, y);
    }

    function setActiveCard(card, force) {
      if (!force && card && !pointerHoverIntent.allow()) return;
      if (!force && card === activeCard) return;

      if (activeCard) activeCard.classList.remove('is-card-hovered');
      if (activeSlide) activeSlide.classList.remove('is-slide-hovered');

      activeCard = card || null;
      activeSlide = card ? card.closest('.carousel-slide') : null;

      if (activeCard) activeCard.classList.add('is-card-hovered');
      if (activeSlide) activeSlide.classList.add('is-slide-hovered');

      if (isWorkCarousel) {
        clearBrandNow();
        applyBrandForCard(activeCard);
      }
    }

    function syncCarouselHover() {
      if (!pointerHoverIntent.allow()) {
        clearHoverOnly();
        return;
      }
      var x = latestDocumentPointer.x;
      var y = latestDocumentPointer.y;
      if (x == null || y == null) return;
      var card = getCardFromPoint(x, y);
      if (card) {
        setActiveCard(card, true);
        if (isWorkCarousel) updateCaseStudyPill(card, x, y);
      }
    }

    function scheduleCarouselHoverSync() {
      syncCarouselHover();
      requestAnimationFrame(function() {
        syncCarouselHover();
        requestAnimationFrame(syncCarouselHover);
      });
      setTimeout(syncCarouselHover, 50);
      setTimeout(syncCarouselHover, 200);
    }

    function clearHoverOnly() {
      setActiveCard(null, true);
    }

    function isCarouselCard(el) {
      return el && el.closest && !!el.closest('.carousel-slide .bento-card, .carousel-slide .side-project-card');
    }

    getAllCards().forEach(function(card) {
      if (card.dataset.carouselHoverBound === 'true') return;
      card.dataset.carouselHoverBound = 'true';

      card.addEventListener('mouseenter', function(e) {
        rememberPointer(e.clientX, e.clientY);
        if (!pointerHoverIntent.allow()) return;
        brandIntentCard = null;
        setActiveCard(card, true);
        trackCarouselCardHover(card);
        if (isWorkCarousel) updateCaseStudyPill(card, e.clientX, e.clientY);
      }, { passive: true });

      card.addEventListener('mousemove', function(e) {
        rememberPointer(e.clientX, e.clientY);
        if (!pointerHoverIntent.allow()) return;
        markBrandIntent(card);
        setActiveCard(card, true);
        if (activeCard === card) {
          if (isWorkCarousel) {
            applyBrandForCard(card);
            updateCaseStudyPill(card, e.clientX, e.clientY);
          }
        }
      }, { passive: true });

      card.addEventListener('mouseleave', function(e) {
        if (isCarouselCard(e.relatedTarget)) return;
        var cardRef = card;
        requestAnimationFrame(function() {
          if (cardRef.matches(':hover')) return;
          var px = latestDocumentPointer.x;
          var py = latestDocumentPointer.y;
          if (px != null && py != null && getCardFromPoint(px, py) === cardRef) return;
          if (activeCard === cardRef) setActiveCard(null, true);
        });
      });
    });

    vpEl.addEventListener('mousemove', function(e) {
      rememberPointer(e.clientX, e.clientY);
      var card = getCardFromPoint(e.clientX, e.clientY);
      if (card) markBrandIntent(card);
      syncCarouselHover();
    }, { passive: true });

    vpEl.addEventListener('mouseleave', function(e) {
      if (carouselEl.contains(e.relatedTarget)) return;
      requestAnimationFrame(function() {
        if (getCardFromPoint(latestDocumentPointer.x, latestDocumentPointer.y)) return;
        clearHoverOnly();
      });
    });

    vpEl._forceCarouselHoverSync = syncCarouselHover;
    vpEl._clearCarouselHover = clearHoverOnly;
    vpEl._scheduleCarouselHoverSync = scheduleCarouselHoverSync;
    vpEl._applyCurrentSlideHover = syncCarouselHover;
  }

  bindBrandHovers();

  /* ----- Intro peek: Selected Work cards visible at bottom of first viewport ----- */
  var lockedWorkPeekLayout = null;

  /* Keep the blurb a consistent distance below the fixed header on every screen.
     The CSS --site-header-clearance is only an estimate; on some viewports the
     real header is taller, leaving the blurb cramped against it. Measure the
     actual header and drive the clearance (plus breathing room) from it. */
  var headerClearanceEl = document.querySelector('.site-header');
  function syncHeaderClearance() {
    if (!headerClearanceEl) return;
    if (!window.matchMedia('(max-width: 1024px)').matches) {
      root.style.removeProperty('--site-header-clearance');
      return;
    }
    var h = headerClearanceEl.getBoundingClientRect().height;
    if (!h) return;
    var gap = Math.round(window.innerHeight * 0.03);
    gap = Math.min(Math.max(gap, 18), 34);
    root.style.setProperty('--site-header-clearance', Math.round(h + gap) + 'px');
  }
  syncHeaderClearance();

  var PORTFOLIO_LAYOUT_EVENT = 'portfolio-layout';

  function dispatchPortfolioLayout(detail) {
    window.dispatchEvent(new CustomEvent(PORTFOLIO_LAYOUT_EVENT, {
      detail: detail || {}
    }));
  }

  function runPostIntroLayoutPass() {
    syncHeaderClearance();
    if (root.classList.contains('blurb-reveal-done')) {
      layoutWorkPeek(false);
    }
    dispatchPortfolioLayout({ pass: 'post-intro' });
  }

  function layoutWorkPeek(force) {
    if (
      root.classList.contains('intro-peek-locked') &&
      !root.classList.contains('blurb-reveal-done') &&
      !root.classList.contains('site-reveal-measure')
    ) {
      return;
    }

    if (
      !root.classList.contains('blurb-reveal-done') &&
      !root.classList.contains('intro-layout-primed') &&
      !root.classList.contains('site-reveal-prep') &&
      !root.classList.contains('site-reveal-measure')
    ) {
      root.style.setProperty('--work-peek', '0px');
      return;
    }

    var intro = document.querySelector('.intro-screen');
    var workSection = document.querySelector('.main > .work-section:not(.work-section--side)');
    if (!intro || !workSection) return;

    var viewportHeight = window.innerHeight;
    var viewportWidth = window.innerWidth;
    var isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (!force && lockedWorkPeekLayout && isMobile) {
      var heightDelta = Math.abs(viewportHeight - lockedWorkPeekLayout.height);
      var widthChanged = viewportWidth !== lockedWorkPeekLayout.width;
      if (!widthChanged && heightDelta < 140) {
        root.style.setProperty('--work-card-peek', lockedWorkPeekLayout.cardPeek + 'px');
        root.style.setProperty('--work-peek', lockedWorkPeekLayout.peek + 'px');
        return;
      }
    }

    var head = workSection.querySelector('.work-section-head');
    var headStyle = head ? getComputedStyle(head) : null;
    var headHeight = head ? head.offsetHeight : 0;
    var headMargin = headStyle ? parseFloat(headStyle.marginBottom) || 0 : 0;
    var cardPeek = Math.round(
      Math.min(Math.max(viewportHeight * 0.11, 56), 112)
    );
    var peek = headHeight + headMargin + cardPeek;

    lockedWorkPeekLayout = {
      height: viewportHeight,
      width: viewportWidth,
      cardPeek: cardPeek,
      peek: peek
    };

    root.style.setProperty('--work-card-peek', cardPeek + 'px');
    root.style.setProperty('--work-peek', peek + 'px');
  }

  function runLayoutWorkPeek() {
    layoutWorkPeek(true);
    requestAnimationFrame(function() {
      window.dispatchEvent(new Event('resize'));
    });
  }

  function primeIntroLayout() {
    root.classList.add('site-reveal-measure');
    layoutWorkPeek(true);
    root.classList.remove('site-reveal-measure');
    root.classList.add('intro-layout-primed');
    if (window.matchMedia('(max-width: 768px)').matches) {
      root.classList.add('intro-peek-locked');
    }
  }

  function handleBlurbRevealComplete() {
    var isMobile = window.matchMedia('(max-width: 768px)').matches;
    root.classList.remove('intro-peek-locked');
    syncHeaderClearance();
    if (isMobile) {
      // Carousel layout is settled synchronously in the blurb-reveal-complete
      // listener; firing resize here retriggers a full relayout mid-fade.
      // finishMobileIntro schedules the post-fade resize pass instead.
      return;
    }
    runLayoutWorkPeek();
  }

  if (root.classList.contains('blurb-reveal-done')) {
    runLayoutWorkPeek();
  } else if (!reduceMotionIntro) {
    primeIntroLayout();
    window.addEventListener('blurb-reveal-complete', handleBlurbRevealComplete, { once: true });
  } else {
    window.addEventListener('blurb-reveal-complete', handleBlurbRevealComplete, { once: true });
  }

  window.addEventListener('resize', function() {
    clearTimeout(layoutWorkPeek._timer);
    layoutWorkPeek._timer = setTimeout(function() {
      syncHeaderClearance();
      if (root.classList.contains('blurb-reveal-done')) {
        layoutWorkPeek(false);
      } else if (
        root.classList.contains('intro-layout-primed') &&
        !root.classList.contains('intro-peek-locked')
      ) {
        primeIntroLayout();
      }
    }, 100);
  });

  window.addEventListener('orientationchange', function() {
    clearTimeout(layoutWorkPeek._orientationTimer);
    layoutWorkPeek._orientationTimer = setTimeout(function() {
      root.classList.remove('intro-peek-locked');
      syncHeaderClearance();
      if (root.classList.contains('blurb-reveal-done')) {
        layoutWorkPeek(true);
      } else {
        primeIntroLayout();
      }
    }, 150);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() {
      syncHeaderClearance();
      if (root.classList.contains('blurb-reveal-done')) layoutWorkPeek();
    });
  }

  /* ----- Carousels (Selected Work + Side projects) ----- */
  function getCarouselCardKey(slide) {
    if (!slide) return '';
    var card = slide.querySelector('.bento-card, .side-project-card');
    if (!card) return '';
    return card.getAttribute('data-side-project') || card.getAttribute('data-brand') || '';
  }

  function syncCarouselClonePosters(carouselEl, cardKey, posterUrl) {
    if (!carouselEl || !cardKey || !posterUrl) return;
    carouselEl.querySelectorAll('.carousel-slide--clone').forEach(function(slide) {
      if (getCarouselCardKey(slide) !== cardKey) return;
      slide.querySelectorAll('video').forEach(function(video) {
        video.setAttribute('data-poster', posterUrl);
        video.setAttribute('poster', posterUrl);
      });
      slide.querySelectorAll('.video-frame-poster, .phone-mockup-poster').forEach(function(img) {
        if (!img.getAttribute('src')) img.src = posterUrl;
      });
    });
  }

  function captureVideoPoster(video) {
    if (!video || video.getAttribute('data-poster') || video.getAttribute('poster')) return;
    if (video.getAttribute('data-poster-capture') === 'done') return;

    function tryCapture() {
      if (!video.videoWidth || !video.videoHeight) return;
      try {
        var canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        var ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        var dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        video.setAttribute('data-poster', dataUrl);
        video.setAttribute('poster', dataUrl);
        video.setAttribute('data-poster-capture', 'done');
        var slide = video.closest('.carousel-slide');
        var carouselEl = video.closest('.carousel');
        syncCarouselClonePosters(carouselEl, getCarouselCardKey(slide), dataUrl);
      } catch (err) {
        video.setAttribute('data-poster-capture', 'failed');
      }
    }

    if (video.readyState >= 2) {
      tryCapture();
      return;
    }

    video.setAttribute('data-poster-capture', 'pending');
    video.addEventListener('loadeddata', tryCapture, { once: true });
  }

  function replaceCloneMediaWithPoster(el) {
    var frame = el.closest('.phone-mockup--video, .video-frame');
    if (!frame) {
      el.remove();
      return;
    }

    var poster = el.getAttribute('data-poster') || el.getAttribute('poster');
    if (!poster) return;

    var isPhone = frame.classList.contains('phone-mockup--video');
    var img = document.createElement('img');
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.className = isPhone ? 'phone-mockup-poster' : 'video-frame-poster';
    img.src = poster;
    el.replaceWith(img);
  }

  function resolveCarouselVideoSrc(video) {
    if (!video) return '';
    var mobileSrc = video.getAttribute('data-src-mobile');
    if (mqMobileIntro.matches && mobileSrc) return mobileSrc;
    return video.getAttribute('data-src') || video.getAttribute('src') || '';
  }

  function syncCloneMediaFromOriginal(clone, original) {
    var origVideos = original.querySelectorAll('video');
    var cloneVideos = clone.querySelectorAll('video');
    var i = cloneVideos.length;
    while (i--) {
      var cloneVideo = cloneVideos[i];
      var origVideo = origVideos[i];
      if (!origVideo) continue;

      var poster = origVideo.getAttribute('data-poster') || origVideo.getAttribute('poster');
      if (poster) {
        cloneVideo.setAttribute('data-poster', poster);
        cloneVideo.setAttribute('poster', poster);
      }

      var src = resolveCarouselVideoSrc(origVideo);
      if (src) {
        if (!cloneVideo.getAttribute('data-src')) {
          cloneVideo.setAttribute('data-src', origVideo.getAttribute('data-src') || src);
        }
        var mobileSrc = origVideo.getAttribute('data-src-mobile');
        if (mobileSrc) {
          cloneVideo.setAttribute('data-src-mobile', mobileSrc);
        }
        cloneVideo.removeAttribute('data-loaded');
        cloneVideo.removeAttribute('src');
      }
    }
  }

  function markVideoFramePlaying(mediaEl) {
    var frame = mediaEl && mediaEl.closest('.video-frame');
    if (frame) frame.classList.add('is-playing');
  }

  function restartCarouselVideo(video) {
    if (!video) return;
    var url = resolveCarouselVideoSrc(video);
    if (!url && !video.src) return;
    if (video.getAttribute('data-loaded') !== 'true') return;

    video.muted = true;
    if (video.ended) {
      video.currentTime = 0;
    }

    var playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(function() {
        try {
          video.load();
        } catch (err) {}
        video.play().catch(function() {});
      });
    }
  }

  function resumeCarouselSlideMedia(slide) {
    if (!slide) return;
    slide.querySelectorAll('video').forEach(restartCarouselVideo);
  }

  function pauseCarouselSlideMedia(slide) {
    if (!slide) return;
    slide.querySelectorAll('video').forEach(function(video) {
      if (!video.paused) video.pause();
    });
  }

  function ensureCarouselSlideMediaPlaying(slide) {
    if (!slide) return;
    loadCarouselSlideMedia(slide);
    resumeCarouselSlideMedia(slide);
  }

  function loadCarouselSlideMedia(slide) {
    if (!slide) return;
    slide.querySelectorAll('iframe[data-src]').forEach(function(iframe) {
      var url = iframe.getAttribute('data-src');
      if (!url || iframe.getAttribute('data-loaded') === 'true') return;
      iframe.addEventListener('load', function() {
        markVideoFramePlaying(iframe);
      }, { once: true });
      iframe.src = url;
      iframe.setAttribute('data-loaded', 'true');
    });
    slide.querySelectorAll('video[data-src]').forEach(function(video) {
      var url = resolveCarouselVideoSrc(video);
      if (!url) return;
      if (video.getAttribute('data-loaded') === 'true') {
        captureVideoPoster(video);
        resumeCarouselSlideMedia(slide);
        return;
      }
      video.addEventListener('loadeddata', function() {
        markVideoFramePlaying(video);
        captureVideoPoster(video);
      }, { once: true });
      video.addEventListener('playing', function() {
        markVideoFramePlaying(video);
      }, { once: true });
      video.src = url;
      video.setAttribute('data-loaded', 'true');
      video.play().catch(function() {});
    });
  }

  function loadVisibleCarouselMedia(vpEl, slideEls) {
    var vpRect = vpEl.getBoundingClientRect();
    slideEls.forEach(function(slide) {
      var rect = slide.getBoundingClientRect();
      var visibleWidth = Math.min(rect.right, vpRect.right) - Math.max(rect.left, vpRect.left);
      if (visibleWidth > rect.width * 0.12) {
        loadCarouselSlideMedia(slide);
        resumeCarouselSlideMedia(slide);
      }
    });
  }

  function loadNearbyCarouselMedia(slideEls, centerIndex, range) {
    var span = range == null ? 2 : range;
    // Mobile shows one slide and pauses the rest, so eagerly setting src on
    // neighbours just floods the device's limited video decoders (each .mov is
    // expensive) and stalls the post-blurb reveal for ~10s. Only the visible
    // slide needs media up front; neighbours load on swipe.
    if (mqMobileIntro.matches) span = 0;
    for (var i = centerIndex - span; i <= centerIndex + span; i++) {
      if (i >= 0 && i < slideEls.length) {
        loadCarouselSlideMedia(slideEls[i]);
      }
    }
  }

  function initCarousel(carouselEl, controlsEl, titleEl) {
    if (!carouselEl) return;

    const vpEl = carouselEl.querySelector('.carousel-viewport');
    if (!vpEl) return;

    vpEl.addEventListener('touchmove', function() { touchDidMove = true; }, { passive: true });
    const trackEl = carouselEl.querySelector('.carousel-track');
    const originalSlides = Array.from(carouselEl.querySelectorAll('.carousel-slide'));
    const ctrlRoot = controlsEl || carouselEl;
    const prevBtn = ctrlRoot.querySelector('.carousel-btn--prev');
    const nextBtn = ctrlRoot.querySelector('.carousel-btn--next');
    const playBtn = ctrlRoot.querySelector('.carousel-btn--play');

    const realCount = originalSlides.length;
    if (realCount === 0) return;

    const carouselName = carouselEl.id === 'sideProjectsCarousel'
      ? 'side-projects'
      : (carouselEl.id === 'workCarousel' ? 'work' : carouselEl.id || 'carousel');

    const hasLoop = realCount > 1;

    function getRealSlideIndex(index) {
      if (!hasLoop) return index;
      return ((index - realCount) % realCount + realCount) % realCount;
    }

    function getSlideLabel(index) {
      var slide = originalSlides[getRealSlideIndex(index)];
      if (!slide) return 'slide-unknown';
      var title = slide.querySelector('.bento-card-title');
      return title ? title.textContent.trim().replace(/\s+/g, ' ') : 'slide-unknown';
    }

    function trackCarouselEngagement(action, extra) {
      var payload = {
        carousel: carouselName,
        slide: getSlideLabel(current),
        action: action
      };
      if (extra) {
        Object.keys(extra).forEach(function(key) {
          payload[key] = extra[key];
        });
      }
      trackEvent('carousel-engagement', payload);
    }

    function prepareClone(slide) {
      const clone = slide.cloneNode(true);
      clone.classList.add('carousel-slide--clone');
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('[data-carousel-hover-bound]').forEach(function(el) {
        el.removeAttribute('data-carousel-hover-bound');
      });
      syncCloneMediaFromOriginal(clone, slide);
      clone.querySelectorAll('iframe').forEach(function(el) {
        var frame = el.closest('.phone-mockup--video, .video-frame');
        var poster = el.getAttribute('data-poster') || el.getAttribute('poster');
        if (frame && poster) {
          replaceCloneMediaWithPoster(el);
        } else {
          el.remove();
        }
      });
      return clone;
    }

    if (hasLoop) {
      const beforeFrag = document.createDocumentFragment();
      const afterFrag = document.createDocumentFragment();
      originalSlides.forEach(function(slide) {
        beforeFrag.appendChild(prepareClone(slide));
        afterFrag.appendChild(prepareClone(slide));
      });
      trackEl.insertBefore(beforeFrag, originalSlides[0]);
      trackEl.appendChild(afterFrag);
    }

    // Desktop can comfortably decode every slide's video up front. Mobile
    // cannot: setting src on all ~13 .mov clips at once saturates the phone's
    // video decoders and blocks the main thread, which is what made the rest of
    // the site take ~10s to appear after the blurb. On mobile load only the
    // first (visible) slide; the others load on swipe / when scrolled into view.
    if (mqMobileIntro.matches) {
      if (originalSlides[0]) loadCarouselSlideMedia(originalSlides[0]);
    } else {
      originalSlides.forEach(loadCarouselSlideMedia);
    }

    const slideEls = trackEl.querySelectorAll('.carousel-slide');
    const count = slideEls.length;

    let current = hasLoop ? realCount : 0;
    var carouselState = {
      getCurrentIndex: function() { return current; },
      getSlideEls: function() { return slideEls; }
    };
    initCarouselPointerHover(carouselEl, vpEl, carouselState);
    let timer = null;
    let isAnimating = false;
    let normalizeFallbackTimer = null;
    let wasPlayingBeforeHover = false;
    const INTERVAL = 30000;
    const TRANSITION_MS = 520;

    function getMetrics() {
      var vpRect = vpEl.getBoundingClientRect();
      var refEl = titleEl || controlsEl;
      var refRect = refEl ? refEl.getBoundingClientRect() : vpRect;

      var contentLeft = window.matchMedia('(max-width: 768px)').matches
        ? 0
        : refRect.left - vpRect.left;
      var slideW = slideEls[0].offsetWidth;
      var gapVal = parseFloat(getComputedStyle(trackEl).gap) || 16;
      var step = slideW + gapVal;

      return { contentLeft: contentLeft, step: step, ready: slideW > 0 };
    }

    function getTransform(index) {
      if (!trackEl || !slideEls.length || !vpEl) return 0;
      var metrics = getMetrics();
      if (!metrics.ready) return 0;
      return metrics.contentLeft - index * metrics.step;
    }

    function isCarouselWheelSnap() {
      return window.matchMedia('(max-width: 768px)').matches;
    }

    function getVisualTransform() {
      if (!trackEl) return 0;
      return new DOMMatrixReadOnly(getComputedStyle(trackEl).transform).m41;
    }

    function syncCurrentFromVisualPosition() {
      var metrics = getMetrics();
      if (!metrics.ready) return;

      var visualTx = getVisualTransform();
      var rawIndex = (metrics.contentLeft - visualTx) / metrics.step;
      rawIndex = Math.max(0, Math.min(count - 1, rawIndex));
      var newCurrent = wrapCarouselIndex(Math.round(rawIndex));

      if (newCurrent !== current) {
        current = newCurrent;
      }

      if (!isCarouselWheelSnap()) {
        freeScrollOffset = getTransform(current) - visualTx;
      } else {
        freeScrollOffset = 0;
      }
    }

    function clampFreeScrollOffset() {
      if (isCarouselWheelSnap() || !getMetrics().ready) return;

      var maxOffset = getTransform(current) - getTransform(count - 1);
      var minOffset = getTransform(current) - getTransform(0);
      if (maxOffset < minOffset) {
        var tmp = maxOffset;
        maxOffset = minOffset;
        minOffset = tmp;
      }
      freeScrollOffset = Math.max(minOffset, Math.min(maxOffset, freeScrollOffset));
    }

    function reconcileFreeScrollPosition() {
      if (!hasLoop || isCarouselWheelSnap()) return;

      syncCurrentFromVisualPosition();
      clampFreeScrollOffset();
      normalizeLoopPosition(true);

      trackEl.style.transition = 'none';
      trackEl.style.transform = 'translate3d(' + (getTransform(current) - freeScrollOffset) + 'px, 0, 0)';
      void trackEl.offsetHeight;
      trackEl.style.transition = '';
      applyCarouselMediaForCurrent();
      if (typeof vpEl._scheduleCarouselHoverSync === 'function') vpEl._scheduleCarouselHoverSync();
    }

    function setTrackWheeling(active) {
      trackEl.classList.toggle('is-wheeling', !!active);
    }

    function setTransform(index, animate) {
      var tx = getTransform(index);
      if (animate !== false) {
        freeScrollOffset = 0;
      } else if (!isCarouselWheelSnap()) {
        tx -= freeScrollOffset;
      }
      if (animate === false) trackEl.style.transition = 'none';
      if (animate !== false) {
        trackEl.classList.add('is-sliding');
      }
      trackEl.style.transform = 'translate3d(' + tx + 'px, 0, 0)';
      if (animate === false) {
        void trackEl.offsetHeight;
        trackEl.style.transition = '';
      }
    }

    function applyCarouselMediaForCurrent() {
      var realIdx = getRealSlideIndex(current);
      var activeSlide = slideEls[current] || originalSlides[realIdx];
      var activeIsClone = !!(activeSlide && activeSlide.classList.contains('carousel-slide--clone'));

      originalSlides.forEach(function(slide, slideIdx) {
        if (!activeIsClone && slideIdx === realIdx) {
          ensureCarouselSlideMediaPlaying(slide);
        } else {
          pauseCarouselSlideMedia(slide);
        }
      });

      if (activeIsClone) {
        ensureCarouselSlideMediaPlaying(activeSlide);
      }
    }

    function ensureCarouselMediaAtIndex() {
      normalizeLoopPosition(false);
      applyCarouselMediaForCurrent();
    }

    function completeCarouselStep() {
      if (normalizeFallbackTimer) {
        clearTimeout(normalizeFallbackTimer);
        normalizeFallbackTimer = null;
      }
      if (!isAnimating) return;
      isAnimating = false;
      freeScrollOffset = 0;
      syncCurrentFromVisualPosition();
      normalizeLoopPosition(false);
      loadCarouselMediaAround(current, 2);
      applyCarouselMediaForCurrent();
      loadVisibleCarouselMedia(vpEl, slideEls);
      trackEl.classList.remove('is-sliding');
      if (typeof vpEl._scheduleCarouselHoverSync === 'function') vpEl._scheduleCarouselHoverSync();
      requestAnimationFrame(function() {
        normalizeLoopPosition(false);
        applyCarouselMediaForCurrent();
        loadVisibleCarouselMedia(vpEl, slideEls);
        if (typeof vpEl._scheduleCarouselHoverSync === 'function') vpEl._scheduleCarouselHoverSync();
        updateSiteHeaderTone();
        updateFabTone();
      });
    }

    function finishCarouselTransition() {
      completeCarouselStep();
    }

    function normalizeLoopPosition(preserveVisual, preserveTxOverride) {
      if (!hasLoop) return false;
      var metrics = getMetrics();
      var txAdjust = 0;
      var shifted = false;
      while (current >= realCount * 2) {
        current -= realCount;
        if (metrics.ready) txAdjust += realCount * metrics.step;
        shifted = true;
      }
      while (current < realCount) {
        current += realCount;
        if (metrics.ready) txAdjust -= realCount * metrics.step;
        shifted = true;
      }
      if (!shifted) return false;

      if (preserveVisual && !isCarouselWheelSnap() && metrics.ready) {
        var preserveTx = preserveTxOverride != null ? preserveTxOverride : getVisualTransform();
        preserveTx += txAdjust;
        freeScrollOffset = getTransform(current) - preserveTx;
        clampFreeScrollOffset();
      } else {
        freeScrollOffset = 0;
      }

      trackEl.style.transition = 'none';
      var tx = getTransform(current);
      if (!isCarouselWheelSnap() && preserveVisual) {
        tx -= freeScrollOffset;
      }
      trackEl.style.transform = 'translate3d(' + tx + 'px, 0, 0)';
      void trackEl.offsetHeight;
      trackEl.style.transition = '';
      if (typeof vpEl._scheduleCarouselHoverSync === 'function') vpEl._scheduleCarouselHoverSync();
      return true;
    }

    function wrapCarouselIndex(index) {
      if (!hasLoop) return Math.max(0, Math.min(index, count - 1));
      while (index >= count) index -= realCount;
      while (index < 0) index += realCount;
      return index;
    }

    function loadCarouselMediaAround(index, range) {
      var span = range == null ? 3 : range;
      // See loadNearbyCarouselMedia: on mobile only load the slide in view to
      // avoid saturating the decoder. Neighbours load when navigated to.
      if (mqMobileIntro.matches) span = 0;
      for (var offset = -span; offset <= span; offset++) {
        var idx = wrapCarouselIndex(index + offset);
        loadCarouselSlideMedia(slideEls[idx]);
        loadCarouselSlideMedia(originalSlides[getRealSlideIndex(idx)]);
      }
    }

    function go(i, animate) {
      if (animate === undefined) animate = true;
      if (!getMetrics().ready) return;
      if (animate && isAnimating) return;

      if (animate && canHoverFinePointer) {
        pointerHoverIntent.suppress(TRANSITION_MS + 120);
      }

      freeScrollOffset = 0;
      current = wrapCarouselIndex(i);

      if (!mqMobileIntro.matches || !animate) {
        loadCarouselMediaAround(current, 3);
      }
      setTransform(current, animate);
      if (animate) {
        isAnimating = true;
        if (normalizeFallbackTimer) clearTimeout(normalizeFallbackTimer);
        normalizeFallbackTimer = setTimeout(completeCarouselStep, TRANSITION_MS + 60);
      } else {
        normalizeLoopPosition(false);
        ensureCarouselMediaAtIndex();
        loadVisibleCarouselMedia(vpEl, slideEls);
        if (typeof vpEl._scheduleCarouselHoverSync === 'function') {
          vpEl._scheduleCarouselHoverSync();
        }
      }
    }

    function settlePosition(animate, skipMedia) {
      if (!getMetrics().ready) {
        if (!introRevealLayoutReady()) return;
        settlePosition._retries = (settlePosition._retries || 0) + 1;
        if (settlePosition._retries < 48) {
          requestAnimationFrame(function() { settlePosition(animate, skipMedia); });
        }
        return;
      }
      settlePosition._retries = 0;
      normalizeLoopPosition(false);
      freeScrollOffset = 0;
      setTransform(current, animate === true);
      // applyCarouselMediaForCurrent() starts decoding the visible video. On
      // mobile we skip it during the reveal so the fade isn't stuttered by
      // decode work, then run it once the fade has finished.
      if (!skipMedia) applyCarouselMediaForCurrent();
    }

    var WORK_CAROUSEL_TARGET_HEIGHT = 710;

    function equalizeCarouselCardHeights() {
      if (!introRevealLayoutReady()) return;

      var allCards = trackEl.querySelectorAll('.carousel-slide .bento-card');
      allCards.forEach(function(card) {
        card.style.minHeight = '';
      });

      if (!getMetrics().ready) {
        equalizeCarouselCardHeights._retries = (equalizeCarouselCardHeights._retries || 0) + 1;
        if (equalizeCarouselCardHeights._retries < 48) {
          requestAnimationFrame(equalizeCarouselCardHeights);
        }
        return;
      }
      equalizeCarouselCardHeights._retries = 0;

      if (trackEl.id === 'workCarousel' && typeof window.applyWorkCarouselTargetHeight === 'function') {
        window.applyWorkCarouselTargetHeight();
      } else if (trackEl.id === 'workCarousel' && typeof window.layoutPhoneScrollCards === 'function') {
        window.layoutPhoneScrollCards();
      }

      var maxHeight = 0;
      originalSlides.forEach(function(slide) {
        var card = slide.querySelector('.bento-card');
        if (!card) return;
        maxHeight = Math.max(maxHeight, card.offsetHeight);
      });

      if (maxHeight <= 0) return;

      var isMobileCarousel = window.matchMedia('(max-width: 768px)').matches;
      if (trackEl.id === 'workCarousel' && isMobileCarousel) {
        var mobileCap = Math.round(window.innerHeight * 0.62);
        maxHeight = Math.min(maxHeight, mobileCap);
      }
      var heightPx = Math.ceil(maxHeight) + 'px';
      if (trackEl.id === 'workCarousel' && !isMobileCarousel && maxHeight < WORK_CAROUSEL_TARGET_HEIGHT) {
        heightPx = WORK_CAROUSEL_TARGET_HEIGHT + 'px';
      }
      allCards.forEach(function(card) {
        card.style.minHeight = heightPx;
      });

      if (typeof window.layoutSquarePhoneScroll === 'function') {
        requestAnimationFrame(window.layoutSquarePhoneScroll);
      }
    }

    if (trackEl.id === 'workCarousel') {
      window.equalizeWorkCarouselCardHeights = equalizeCarouselCardHeights;
    }

    if (hasLoop) {
      trackEl.addEventListener('transitionend', function(e) {
        if (e.target !== trackEl || e.propertyName.indexOf('transform') === -1 || !isAnimating) return;
        finishCarouselTransition();
      });
    }

    function play() {
      stop();
      timer = setInterval(function() { go(current + 1); }, INTERVAL);
      if (playBtn) {
        playBtn.setAttribute('data-playing', 'true');
        playBtn.setAttribute('aria-label', 'Pause carousel');
      }
    }

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
      if (playBtn) {
        playBtn.setAttribute('data-playing', 'false');
        playBtn.setAttribute('aria-label', 'Play carousel');
      }
    }

    if (prevBtn) prevBtn.addEventListener('click', function() {
      go(current - 1);
      stop();
      trackCarouselEngagement('prev');
    });
    if (nextBtn) nextBtn.addEventListener('click', function() {
      go(current + 1);
      stop();
      trackCarouselEngagement('next');
    });
    if (playBtn) playBtn.addEventListener('click', function() {
      if (playBtn.getAttribute('data-playing') === 'true') {
        stop();
        trackCarouselEngagement('pause');
      } else {
        play();
        trackCarouselEngagement('play');
      }
    });

    vpEl.addEventListener('mouseenter', function() {
      wasPlayingBeforeHover = !!timer;
      stop();
    });
    vpEl.addEventListener('mouseleave', function() {
      if (wasPlayingBeforeHover) play();
    });

    function runCarouselLayoutPass(skipMedia) {
      settlePosition._retries = 0;
      equalizeCarouselCardHeights._retries = 0;
      settlePosition(false, skipMedia);
      equalizeCarouselCardHeights();
      if (skipMedia) return;
      loadNearbyCarouselMedia(slideEls, current, 2);
      loadVisibleCarouselMedia(vpEl, slideEls);
    }

    current = hasLoop ? realCount : 0;

    // On mobile, hold off all video decode until the content-reveal fade has
    // finished so the IntersectionObservers below don't load media mid-fade.
    var mediaRevealReady = !mqMobileIntro.matches;

    window.addEventListener('blurb-reveal-complete', function() {
      var deferMedia = mqMobileIntro.matches;
      // Settle position + card heights synchronously while the revealed
      // sections are still at opacity 0, so the layout is stable for the
      // whole fade. On mobile, one pass only (no trailing rAF relayout) and
      // defer video decode until after the fade.
      runCarouselLayoutPass(deferMedia);
      if (!deferMedia) {
        requestAnimationFrame(function() {
          requestAnimationFrame(function() { runCarouselLayoutPass(deferMedia); });
        });
      }
      if (deferMedia) {
        setTimeout(function() {
          mediaRevealReady = true;
          runCarouselLayoutPass(false);
        }, 1200);
      }
    }, { once: true });

    window.addEventListener('load', function() {
      if (!root.classList.contains('blurb-reveal-done')) return;
      equalizeCarouselCardHeights();
    });
    carouselEl.querySelectorAll('img').forEach(function(img) {
      if (!img.complete) {
        img.addEventListener('load', function() {
          if (root.classList.contains('blurb-reveal-done')) equalizeCarouselCardHeights();
        }, { once: true });
      }
    });

    if (typeof IntersectionObserver !== 'undefined') {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            play();
            if (mediaRevealReady) loadVisibleCarouselMedia(vpEl, slideEls);
          } else {
            stop();
          }
        });
      }, { threshold: 0.1, rootMargin: '0px' });
      observer.observe(carouselEl);

      if (typeof IntersectionObserver !== 'undefined') {
        var slideMediaObserver = new IntersectionObserver(function(entries) {
          if (!mediaRevealReady) return;
          entries.forEach(function(entry) {
            if (entry.isIntersecting) {
              ensureCarouselSlideMediaPlaying(entry.target);
            }
          });
        }, { root: vpEl, threshold: 0.15 });
        originalSlides.forEach(function(slide) {
          slideMediaObserver.observe(slide);
        });
      }
    } else {
      play();
    }

    var resizeTimer;
    var lockedCarouselViewport = null;
    function onCarouselViewportChange() {
      var viewportHeight = window.innerHeight;
      var viewportWidth = window.innerWidth;
      var isMobileCarousel = window.matchMedia('(max-width: 768px)').matches;
      if (
        isMobileCarousel &&
        lockedCarouselViewport &&
        viewportWidth === lockedCarouselViewport.width &&
        Math.abs(viewportHeight - lockedCarouselViewport.height) < 140
      ) {
        return;
      }
      lockedCarouselViewport = {
        height: viewportHeight,
        width: viewportWidth
      };

      if (root.classList.contains('blurb-reveal-done')) layoutWorkPeek();
      isAnimating = false;
      normalizeLoopPosition(false);
      settlePosition(false);
      equalizeCarouselCardHeights();
      loadNearbyCarouselMedia(slideEls, current, 2);
      ensureCarouselMediaAtIndex();
      loadVisibleCarouselMedia(vpEl, slideEls);
      if (typeof vpEl._scheduleCarouselHoverSync === 'function') vpEl._scheduleCarouselHoverSync();
    }

    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(onCarouselViewportChange, 100);
    });
    window.addEventListener(PORTFOLIO_LAYOUT_EVENT, function(e) {
      if (!e.detail || e.detail.pass !== 'post-intro') return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(onCarouselViewportChange, 0);
    });

    var touchStartX = 0;
    var touchStartY = 0;
    var SWIPE_THRESHOLD = 50;

    vpEl.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    vpEl.addEventListener('touchend', function(e) {
      if (e.changedTouches.length !== 1) return;
      var touchEndX = e.changedTouches[0].clientX;
      var touchEndY = e.changedTouches[0].clientY;
      var deltaX = touchStartX - touchEndX;
      var deltaY = touchStartY - touchEndY;
      if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
        stop();
        if (deltaX > 0) {
          go(current + 1);
          trackCarouselEngagement('swipe', { direction: 'next' });
        } else {
          go(current - 1);
          trackCarouselEngagement('swipe', { direction: 'prev' });
        }
      }
    }, { passive: true });

    var dragStartX = 0;
    var dragStartY = 0;
    var isDragging = false;

    vpEl.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      isDragging = true;
      vpEl.classList.add('is-dragging');
      dragStartX = e.clientX;
      dragStartY = e.clientY;
    });

    window.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('mouseup', function(e) {
      if (!isDragging || e.button !== 0) return;
      isDragging = false;
      vpEl.classList.remove('is-dragging');
      var deltaX = dragStartX - e.clientX;
      var deltaY = dragStartY - e.clientY;
      if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
        stop();
        if (deltaX > 0) {
          go(current + 1);
          trackCarouselEngagement('swipe', { direction: 'next' });
        } else {
          go(current - 1);
          trackCarouselEngagement('swipe', { direction: 'prev' });
        }
      }
    });

    var wheelDragOffset = 0;
    var freeScrollOffset = 0;
    var wheelEndTimer = null;
    var isWheelScrolling = false;
    var wheelCommittedSteps = 0;
    var WHEEL_END_MS = 140;
    var WHEEL_SNAP_RATIO = 0.2;
    var WHEEL_COMMIT_RATIO = 0.72;

    function syncCurrentForFreeScroll() {
      var metrics = getMetrics();
      if (!metrics.ready) return;

      var visualTx = getTransform(current) - freeScrollOffset;
      var loopSpan = hasLoop ? realCount * metrics.step : 0;
      var minTx = getTransform(count - 1);
      var maxTx = getTransform(0);

      if (hasLoop && loopSpan > 0) {
        while (visualTx < minTx - 1) {
          visualTx += loopSpan;
        }
        while (visualTx > maxTx + 1) {
          visualTx -= loopSpan;
        }
      }

      var rawIndex = (metrics.contentLeft - visualTx) / metrics.step;
      rawIndex = Math.max(0, Math.min(count - 1, rawIndex));
      var newCurrent = Math.round(rawIndex);

      if (newCurrent !== current) {
        current = newCurrent;
        applyCarouselMediaForCurrent();
      }

      freeScrollOffset = getTransform(current) - visualTx;

      if (hasLoop && (current >= realCount * 2 || current < realCount)) {
        normalizeLoopPosition(true, visualTx);
      }

      loadCarouselMediaAround(current, 3);
    }

    function resetWheelScrollState() {
      if (wheelEndTimer) {
        clearTimeout(wheelEndTimer);
        wheelEndTimer = null;
      }
      isWheelScrolling = false;
      wheelDragOffset = 0;
      wheelCommittedSteps = 0;
      setTrackWheeling(false);
    }

    function snapCarouselToCurrentInstant() {
      isAnimating = false;
      if (normalizeFallbackTimer) {
        clearTimeout(normalizeFallbackTimer);
        normalizeFallbackTimer = null;
      }
      if (isCarouselWheelSnap()) {
        setTransform(current, false);
        return;
      }

      var metrics = getMetrics();
      if (metrics.ready) {
        var visualTx = getVisualTransform();
        var rawIndex = (metrics.contentLeft - visualTx) / metrics.step;
        rawIndex = Math.max(0, Math.min(count - 1, rawIndex));
        current = Math.round(rawIndex);
        freeScrollOffset = getTransform(current) - visualTx;
        if (hasLoop && (current >= realCount * 2 || current < realCount)) {
          normalizeLoopPosition(true, visualTx);
        }
      }
      setTransform(current, false);
    }

    function applyWheelTransform() {
      var metrics = getMetrics();
      if (!metrics.ready) return;
      var tx;

      if (isCarouselWheelSnap()) {
        var maxRemainder = metrics.step * 0.95;
        wheelDragOffset = Math.max(-maxRemainder, Math.min(maxRemainder, wheelDragOffset));
        tx = getTransform(current) - wheelDragOffset;
      } else {
        tx = getTransform(current) - freeScrollOffset;
      }

      trackEl.style.transition = 'none';
      trackEl.style.transform = 'translate3d(' + tx + 'px, 0, 0)';
    }

    function commitWheelSteps() {
      if (!isCarouselWheelSnap()) return false;

      var metrics = getMetrics();
      if (!metrics.ready) return false;

      var step = metrics.step;
      var committed = false;

      while (Math.abs(wheelDragOffset) >= step * WHEEL_COMMIT_RATIO) {
        var advance = wheelDragOffset > 0 ? 1 : -1;
        current = wrapCarouselIndex(current + advance);
        wheelDragOffset -= advance * step;
        wheelCommittedSteps += advance;
        committed = true;
      }

      if (!committed) return false;

      isAnimating = false;
      if (normalizeFallbackTimer) {
        clearTimeout(normalizeFallbackTimer);
        normalizeFallbackTimer = null;
      }
      normalizeLoopPosition(false);
      setTransform(current, false);
      loadCarouselMediaAround(current, 3);
      ensureCarouselMediaAtIndex();
      loadVisibleCarouselMedia(vpEl, slideEls);
      return true;
    }

    function finishWheelScroll() {
      wheelEndTimer = null;
      if (!isWheelScrolling) return;
      isWheelScrolling = false;
      setTrackWheeling(false);

      if (!isCarouselWheelSnap()) {
        wheelDragOffset = 0;
        wheelCommittedSteps = 0;
        trackEl.style.transition = '';
        syncCurrentForFreeScroll();
        ensureFreeScrollShowsOriginals();
        loadVisibleCarouselMedia(vpEl, slideEls);
        if (typeof vpEl._scheduleCarouselHoverSync === 'function') vpEl._scheduleCarouselHoverSync();
        return;
      }

      var metrics = getMetrics();
      if (!metrics.ready) {
        wheelDragOffset = 0;
        wheelCommittedSteps = 0;
        setTransform(current, true);
        return;
      }

      var step = metrics.step;
      var offset = wheelDragOffset;
      var committedSteps = wheelCommittedSteps;
      wheelDragOffset = 0;
      wheelCommittedSteps = 0;
      trackEl.style.transition = '';

      var slideDelta = 0;
      if (Math.abs(offset) >= step * WHEEL_SNAP_RATIO) {
        slideDelta = offset > 0 ? 1 : -1;
      }

      if (slideDelta !== 0) {
        stop();
        go(current + slideDelta, true);
        if (committedSteps === 0) {
          trackCarouselEngagement('wheel', { direction: slideDelta > 0 ? 'next' : 'prev' });
        }
      } else {
        setTransform(current, true);
        if (committedSteps !== 0) {
          trackCarouselEngagement('wheel', {
            direction: committedSteps > 0 ? 'next' : 'prev',
            steps: Math.abs(committedSteps)
          });
        }
      }
    }

    vpEl.addEventListener('wheel', function(e) {
      if (!getMetrics().ready) return;

      var deltas = normalizeWheelDeltas(e, vpEl);
      if (!isHorizontalWheelIntent(deltas.deltaX, deltas.deltaY)) {
        if (isWheelScrolling) {
          resetWheelScrollState();
          setTransform(current, true);
        }
        return;
      }

      var delta = deltas.deltaX;

      e.preventDefault();

      if (!isWheelScrolling) {
        isWheelScrolling = true;
        wheelCommittedSteps = 0;
        setTrackWheeling(true);
        stop();
        snapCarouselToCurrentInstant();
      }

      if (isCarouselWheelSnap()) {
        wheelDragOffset += delta;
        commitWheelSteps();
      } else {
        freeScrollOffset += delta;
      }
      applyWheelTransform();
      if (!isCarouselWheelSnap()) {
        syncCurrentForFreeScroll();
        applyWheelTransform();
        if (typeof vpEl._scheduleCarouselHoverSync === 'function') vpEl._scheduleCarouselHoverSync();
      }
      loadVisibleCarouselMedia(vpEl, slideEls);

      if (wheelEndTimer) clearTimeout(wheelEndTimer);
      wheelEndTimer = setTimeout(finishWheelScroll, WHEEL_END_MS);
    }, { passive: false });
  }

  initCarousel(
    document.getElementById('workCarousel'),
    document.getElementById('workCarouselControls'),
    document.getElementById('work')
  );

  initCarousel(
    document.getElementById('sideProjectsCarousel'),
    document.getElementById('sideProjectsCarouselControls'),
    document.getElementById('side-projects')
  );

  (function initCardVisualScroll() {
    var SQUARE_DESKTOP_ASPECT = 2562 / 2032;
    var CASH_CART_DESKTOP_ASPECT = 2898 / 1874;
    var CASH_CHECKOUT_DESKTOP_ASPECT = 2898 / 1896;
    var PHONE_MOCKUP_ASPECT = 1024 / 475;

    function getDesktopAspect(desktop) {
      if (desktop.closest('.bento-card--cash')) {
        var video = desktop.querySelector('video');
        var src = video ? (video.getAttribute('data-src') || video.getAttribute('src') || '') : '';
        if (src.indexOf('cart-walkthrough') !== -1) return CASH_CART_DESKTOP_ASPECT;
        return CASH_CHECKOUT_DESKTOP_ASPECT;
      }
      return SQUARE_DESKTOP_ASPECT;
    }

    function getScrollCardPad(cardStyle) {
      if (!cardStyle) return 16;
      return parseFloat(cardStyle.paddingLeft)
        || parseFloat(cardStyle.paddingTop)
        || 16;
    }

    function getCardGutterPad(card) {
      if (!card) return 16;
      var style = getComputedStyle(card);
      if (card.matches('.bento-card--square, .bento-card--cash')) {
        var cols = style.gridTemplateColumns.trim().split(/\s+/);
        var gutter = parseFloat(cols[0]);
        if (!Number.isNaN(gutter) && gutter >= 8) return gutter;
      }
      return getScrollCardPad(style);
    }

    function syncScrollTrackGutter(track) {
      var card = track.closest('.bento-card');
      var gutter = getCardGutterPad(card);
      if (card) card.style.setProperty('--scroll-gutter', gutter + 'px');
      track.style.paddingLeft = gutter + 'px';
      track.style.paddingRight = gutter + 'px';
      return gutter;
    }

    function getReferencePhoneWidth() {
      var refPhone = document.querySelector(
        '#workCarousel .carousel-slide:not(.carousel-slide--clone) .bento-card--meta .bento-card-visual--phones .phone-mockup'
      );
      if (!refPhone) {
        refPhone = document.querySelector(
          '#workCarousel .carousel-slide:not(.carousel-slide--clone) .bento-card--cash .cash-phone-row .phone-mockup'
        );
      }
      if (!refPhone) return 0;

      var width = refPhone.getBoundingClientRect().width;
      return width >= 8 ? width : 0;
    }

    function measureStandardPhoneWidth(row, viewport) {
      var phones = row.querySelectorAll('.phone-mockup');
      if (!phones.length) return 0;

      var phoneW = getReferencePhoneWidth();
      var track = row.closest('.phones-scroll-track');
      var trackStyle = track ? getComputedStyle(track) : null;
      var trackPadL = trackStyle ? parseFloat(trackStyle.paddingLeft) || 0 : 0;
      var trackPadR = trackStyle ? parseFloat(trackStyle.paddingRight) || 0 : 0;

      if (phoneW < 8) {
        var effectiveWidth = Math.max(0, viewport.clientWidth - trackPadL - trackPadR);

        row.style.width = effectiveWidth + 'px';
        phones.forEach(function(phone) {
          phone.style.flex = '1 1 0';
          phone.style.width = '';
          phone.style.maxWidth = 'min(36%, max(64px, 30cqi))';
        });

        phoneW = phones[0].getBoundingClientRect().width;
        row.style.width = '';
      }

      if (phoneW < 8) return 0;

      phones.forEach(function(phone) {
        phone.style.flex = '0 0 auto';
        phone.style.width = phoneW + 'px';
        phone.style.maxWidth = 'none';
      });

      return phoneW;
    }

    function getPhoneOuterHeight(phone) {
      if (!phone) return 0;

      var style = getComputedStyle(phone);
      var borderTop = parseFloat(style.borderTopWidth) || 0;
      var borderBottom = parseFloat(style.borderBottomWidth) || 0;
      var borderLeft = parseFloat(style.borderLeftWidth) || 0;
      var borderRight = parseFloat(style.borderRightWidth) || 0;
      var rect = phone.getBoundingClientRect();
      var width = parseFloat(phone.style.width) || rect.width;

      if (width < 8) return 0;

      var innerWidth = Math.max(0, width - borderLeft - borderRight);
      var calculated = Math.round(innerWidth * PHONE_MOCKUP_ASPECT + borderTop + borderBottom);
      var measured = Math.round(rect.height);

      if (measured >= 8) return Math.max(calculated, measured);
      return calculated;
    }

    function sizeDesktopWalkthrough(desktop, targetOuterHeight) {
      var desktopStyle = getComputedStyle(desktop);
      var borderTop = parseFloat(desktopStyle.borderTopWidth) || 0;
      var borderBottom = parseFloat(desktopStyle.borderBottomWidth) || 0;
      var borderLeft = parseFloat(desktopStyle.borderLeftWidth) || 0;
      var borderRight = parseFloat(desktopStyle.borderRightWidth) || 0;
      var innerHeight = Math.max(0, targetOuterHeight - borderTop - borderBottom);
      var desktopAspect = getDesktopAspect(desktop);
      var outerWidth = Math.round(innerHeight * desktopAspect + borderLeft + borderRight);

      desktop.style.aspectRatio = 'auto';
      desktop.style.boxSizing = 'border-box';
      desktop.style.height = targetOuterHeight + 'px';
      desktop.style.minHeight = targetOuterHeight + 'px';
      desktop.style.maxHeight = targetOuterHeight + 'px';
      desktop.style.width = outerWidth + 'px';
      desktop.style.minWidth = outerWidth + 'px';
      desktop.style.maxWidth = outerWidth + 'px';
      desktop.style.flexBasis = outerWidth + 'px';
      desktop.style.flexShrink = '0';
    }

    function syncScrollViewportHeight(viewport) {
      var track = viewport.querySelector('.phones-scroll-track');
      if (!track) return;

      var visualStyle = getComputedStyle(viewport);
      var padTop = parseFloat(visualStyle.paddingTop) || 0;
      var padBottom = parseFloat(visualStyle.paddingBottom) || 0;
      var targetHeight = Math.ceil(track.getBoundingClientRect().height + padTop + padBottom);

      viewport.style.minHeight = '0';
      viewport.style.height = targetHeight + 'px';
    }

    function layoutDesktopWalkthroughs(track, row) {
      var desktops = track.querySelectorAll('.phone-mockup--desktop-walkthrough');
      if (!desktops.length) return;

      var targetHeight = 0;
      row.querySelectorAll('.phone-mockup').forEach(function(phone) {
        targetHeight = Math.max(targetHeight, getPhoneOuterHeight(phone));
      });

      if (targetHeight < 8) return;

      track.style.setProperty('--scroll-phone-height', targetHeight + 'px');
      desktops.forEach(function(desktop) {
        sizeDesktopWalkthrough(desktop, targetHeight);
      });
    }

    function layoutPhoneScrollCards() {
      document.querySelectorAll('.bento-card--square .phones-scroll-track, .bento-card--cash .phones-scroll-track').forEach(function(track) {
        var row = track.querySelector('.phones-scroll-row');
        var desktops = track.querySelectorAll('.phone-mockup--desktop-walkthrough');
        var viewport = track.closest('.bento-card-visual--scroll-x');
        if (!row || !viewport) return;

        syncScrollTrackGutter(track);

        if (!measureStandardPhoneWidth(row, viewport)) return;

        layoutDesktopWalkthroughs(track, row);
        syncScrollViewportHeight(viewport);

        var card = viewport.closest('.bento-card, .side-project-card');
        if (!card || !card.matches(':hover')) {
          viewport.scrollLeft = 0;
        }
        updateScrollOverflowState(viewport);
      });
    }

    function measureWorkCarouselMaxCardHeight() {
      var maxHeight = 0;
      document.querySelectorAll('#workCarousel .carousel-slide:not(.carousel-slide--clone) .bento-card').forEach(function(card) {
        maxHeight = Math.max(maxHeight, card.offsetHeight);
      });
      return maxHeight;
    }

    function applyWorkCarouselTargetHeight() {
      var carousel = document.getElementById('workCarousel');
      if (!carousel) return;

      if (window.matchMedia('(max-width: 768px)').matches) {
        carousel.style.setProperty('--work-scroll-media-pad-extra', '0px');
        layoutPhoneScrollCards();
        return;
      }

      var TARGET = 710;
      carousel.style.setProperty('--work-scroll-media-pad-extra', '0px');
      layoutPhoneScrollCards();

      var maxHeight = measureWorkCarouselMaxCardHeight();
      if (maxHeight > 0 && maxHeight < TARGET) {
        var extraPerSide = Math.ceil((TARGET - maxHeight) / 2);
        carousel.style.setProperty('--work-scroll-media-pad-extra', extraPerSide + 'px');
        layoutPhoneScrollCards();
      }
    }

    window.applyWorkCarouselTargetHeight = applyWorkCarouselTargetHeight;

    function canViewportScrollX(viewport) {
      return viewport.scrollWidth > viewport.clientWidth + 1;
    }

    function getViewportMaxScroll(viewport) {
      return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    }

    function smoothScrollViewport(viewport, target) {
      var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reducedMotion && viewport.scrollTo) {
        viewport.scrollTo({ left: target, behavior: 'smooth' });
        return;
      }
      viewport.scrollLeft = target;
    }

    function updateScrollOverflowState(viewport) {
      viewport.classList.toggle(
        'bento-card-visual--scroll-x-overflow',
        canViewportScrollX(viewport)
      );
    }

    function bindSquareHoverScrollJump(viewport) {
      var card = viewport.closest('.bento-card, .side-project-card');
      if (!card) return;

      card.addEventListener('mouseenter', function() {
        if (!pointerHoverIntent.allow()) return;
        layoutPhoneScrollCards();
        updateScrollOverflowState(viewport);
        if (!canViewportScrollX(viewport)) return;
        viewport.classList.add('is-hover-scroll-active');
        smoothScrollViewport(viewport, getViewportMaxScroll(viewport));
      });

      card.addEventListener('mouseleave', function() {
        viewport.classList.remove('is-hover-scroll-active');
        if (!canViewportScrollX(viewport)) return;
        smoothScrollViewport(viewport, 0);
      });
    }

    function createCashHoverAutoScroll(viewport) {
      var card = viewport.closest('.bento-card, .side-project-card');
      if (!card) return null;

      var rafId = null;
      var lastFrameTime = null;
      var userTookOver = false;
      var AUTO_SCROLL_DURATION_SEC = 13;

      function stop() {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        lastFrameTime = null;
        viewport.classList.remove('is-hover-scroll-active');
      }

      function userTakeover() {
        if (userTookOver) return;
        userTookOver = true;
        stop();
      }

      function tick(timestamp) {
        if (!lastFrameTime) lastFrameTime = timestamp;
        var elapsedSec = (timestamp - lastFrameTime) / 1000;
        lastFrameTime = timestamp;

        if (!canViewportScrollX(viewport)) {
          stop();
          return;
        }

        var maxScroll = getViewportMaxScroll(viewport);
        if (viewport.scrollLeft >= maxScroll - 0.5) {
          viewport.scrollLeft = maxScroll;
          stop();
          return;
        }

        var speed = maxScroll / AUTO_SCROLL_DURATION_SEC;
        viewport.scrollLeft = Math.min(maxScroll, viewport.scrollLeft + speed * elapsedSec);
        rafId = requestAnimationFrame(tick);
      }

      function beginAutoScroll() {
        stop();
        viewport.scrollLeft = 0;
        viewport.classList.add('is-hover-scroll-active');
        lastFrameTime = null;
        rafId = requestAnimationFrame(tick);
      }

      function start() {
        if (!pointerHoverIntent.allow()) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        userTookOver = false;

        if (typeof window.layoutPhoneScrollCards === 'function') {
          window.layoutPhoneScrollCards();
        }
        updateScrollOverflowState(viewport);

        if (!canViewportScrollX(viewport)) {
          requestAnimationFrame(function() {
            if (typeof window.layoutPhoneScrollCards === 'function') {
              window.layoutPhoneScrollCards();
            }
            updateScrollOverflowState(viewport);
            if (!userTookOver && canViewportScrollX(viewport)) beginAutoScroll();
          });
          return;
        }

        beginAutoScroll();
      }

      card.addEventListener('mouseenter', start);

      card.addEventListener('mouseleave', function() {
        stop();
        userTookOver = false;
        if (!canViewportScrollX(viewport)) return;
        smoothScrollViewport(viewport, 0);
      });

      return { userTakeover: userTakeover };
    }

    function bindViewportManualScroll(viewport, onUserTakeover) {
      updateScrollOverflowState(viewport);

      viewport.addEventListener('mousedown', function(e) {
        if (!canViewportScrollX(viewport)) return;
        if (onUserTakeover) onUserTakeover();
        e.stopPropagation();
      });

      viewport.addEventListener('touchstart', function(e) {
        if (!canViewportScrollX(viewport)) return;
        if (onUserTakeover) onUserTakeover();
        e.stopPropagation();
      }, { passive: true });

      viewport.addEventListener('wheel', function(e) {
        if (!canViewportScrollX(viewport)) return;

        var deltas = normalizeWheelDeltas(e, viewport);
        if (!isHorizontalWheelIntent(deltas.deltaX, deltas.deltaY)) return;

        var deltaX = deltas.deltaX;

        var atLeft = viewport.scrollLeft <= 0;
        var atRight = viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 1;
        if ((deltaX < 0 && atLeft) || (deltaX > 0 && atRight)) return;

        if (onUserTakeover) onUserTakeover();
        e.stopPropagation();
        e.preventDefault();
        viewport.scrollLeft += deltaX;
      }, { passive: false });
    }

    document.querySelectorAll('.bento-card-visual--scroll-x').forEach(function(viewport) {
      var isClone = viewport.closest('.carousel-slide--clone');
      var isSquare = viewport.closest('.bento-card--square');
      var isCash = viewport.closest('.bento-card--cash');

      if (isClone) {
        bindViewportManualScroll(viewport, null);
        return;
      }

      if (isSquare && canHoverFinePointer) {
        bindSquareHoverScrollJump(viewport);
      }

      var cashAutoScroll = null;
      if (isCash && canHoverFinePointer) {
        cashAutoScroll = createCashHoverAutoScroll(viewport);
      }

      bindViewportManualScroll(viewport, cashAutoScroll ? cashAutoScroll.userTakeover : null);
    });

    window.addEventListener('resize', function() {
      document.querySelectorAll('.bento-card-visual--scroll-x').forEach(updateScrollOverflowState);
    });

    window.layoutPhoneScrollCards = layoutPhoneScrollCards;
    window.layoutSquarePhoneScroll = layoutPhoneScrollCards;

    var phoneScrollWatchersBooted = false;
    function bootPhoneScrollWatchers() {
      if (phoneScrollWatchersBooted) return;
      phoneScrollWatchersBooted = true;

      if (typeof ResizeObserver !== 'undefined') {
        document.querySelectorAll('.bento-card--square .phones-scroll-track, .bento-card--cash .phones-scroll-track').forEach(function(track) {
          var observer = new ResizeObserver(layoutPhoneScrollCards);
          observer.observe(track);
          var viewport = track.closest('.bento-card-visual--scroll-x');
          if (viewport) observer.observe(viewport);
        });

        var refPhone = document.querySelector(
          '#workCarousel .carousel-slide:not(.carousel-slide--clone) .bento-card--meta .bento-card-visual--phones .phone-mockup'
        );
        if (refPhone) {
          new ResizeObserver(layoutPhoneScrollCards).observe(refPhone);
        }
      }

      window.addEventListener('resize', layoutPhoneScrollCards);
      window.addEventListener('load', layoutPhoneScrollCards);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(layoutPhoneScrollCards);
      }

      document.querySelectorAll('.bento-card--square video, .bento-card--cash video').forEach(function(video) {
        video.addEventListener('loadeddata', layoutPhoneScrollCards);
      });

      requestAnimationFrame(function() {
        requestAnimationFrame(layoutPhoneScrollCards);
      });

      if (typeof IntersectionObserver !== 'undefined') {
        var phoneScrollLayoutObserver = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) layoutPhoneScrollCards();
          });
        }, { threshold: 0.01 });

        document.querySelectorAll('.bento-card--square, .bento-card--cash').forEach(function(card) {
          phoneScrollLayoutObserver.observe(card);
        });
      }
    }

    window.addEventListener(PORTFOLIO_LAYOUT_EVENT, function(e) {
      if (!e.detail || e.detail.pass !== 'post-intro') return;
      layoutPhoneScrollCards();
    });

    if (mqMobileIntro.matches && !root.classList.contains('blurb-reveal-done')) {
      window.addEventListener('blurb-reveal-complete', function() {
        setTimeout(bootPhoneScrollWatchers, 1100);
      }, { once: true });
    } else {
      bootPhoneScrollWatchers();
    }
  })();

  /* ----- Scroll progress + FAB nav ----- */
  var scrollProgressBar = document.getElementById('scrollProgressBar');
  var fabNav = document.getElementById('fabNav');
  var pageSections = [
    { id: 'work', label: 'Selected Work' },
    { id: 'side-projects', label: 'Side projects & prototypes', shortLabel: 'Side Projects' },
    { id: 'experience', label: 'Experience' }
  ];

  function getCurrentSectionIndex() {
    var vh = window.innerHeight;
    var viewportCenterY = window.scrollY + vh / 2;
    var currentIndex = -1;
    for (var i = 0; i < pageSections.length; i++) {
      var el = document.getElementById(pageSections[i].id);
      if (!el) continue;
      var rect = el.getBoundingClientRect();
      var docTop = rect.top + window.scrollY;
      var passedTop = viewportCenterY >= docTop;
      var headingVisible = rect.top >= -20 && rect.top <= vh * 0.6;
      if (passedTop || headingVisible) currentIndex = i;
    }
    return currentIndex;
  }

  function hasReachedWorkSection() {
    if (!root.classList.contains('blurb-reveal-done')) return false;
    var workHeading = document.getElementById('work');
    if (!workHeading) return false;
    return workHeading.getBoundingClientRect().top <= window.innerHeight * 0.42;
  }

  function updateScrollProgress() {
    if (!scrollProgressBar) return;
    var scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    var scrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0
    );
    var maxScroll = scrollHeight - window.innerHeight;
    var progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollTop / maxScroll)) : 0;
    scrollProgressBar.style.width = (progress * 100) + '%';
  }

  function updateFabTone() {
    if (!fabNav || fabNav.classList.contains('fab-hidden')) return;

    var rect = fabNav.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    var sampleX = rect.left + rect.width * 0.5;
    var sampleY = rect.top + rect.height * 0.5;
    var onDark = sampleNeedsLightTextAt(sampleX, sampleY, [fabNav]);
    fabNav.classList.toggle('fab-nav--on-dark', onDark);
    fabNav.classList.toggle('fab-nav--on-light', !onDark);
  }

  function updateFabNav() {
    if (!fabNav) return;
    var showNav = hasReachedWorkSection();
    if (!showNav) {
      fabNav.classList.add('fab-hidden');
      fabNav.setAttribute('aria-hidden', 'true');
      fabNav.querySelectorAll('.fab-nav__link[data-section]').forEach(function(link) {
        link.classList.remove('is-active');
        link.removeAttribute('aria-current');
      });
      return;
    }

    fabNav.classList.remove('fab-hidden');
    fabNav.setAttribute('aria-hidden', 'false');

    var activeIndex = getCurrentSectionIndex();
    fabNav.querySelectorAll('.fab-nav__link[data-section]').forEach(function(link) {
      var sectionId = link.getAttribute('data-section');
      var isActive = activeIndex >= 0 && pageSections[activeIndex].id === sectionId;
      link.classList.toggle('is-active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    updateFabTone();
  }

  var siteHeader = document.querySelector('.site-header');
  var siteHeaderTitle = document.querySelector('.site-header-title');
  var darkBackdropBrands = {
    meta: true,
    square: true,
    block: true,
    cash: true,
    cashapp: true,
    ogilvy: true,
    drover: true,
    skimlinks: true,
    instagram: true,
    facebook: true
  };

  function parseColorChannels(color) {
    if (!color || color === 'transparent') return null;
    var match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return null;
    return {
      r: +match[1],
      g: +match[2],
      b: +match[3],
      a: match[4] !== undefined ? +match[4] : 1
    };
  }

  function colorLuminance(r, g, b) {
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  function isWorkCarouselBackdrop(node) {
    return !!(node && node.closest && node.closest('#workCarousel .carousel-slide .bento-card'));
  }

  function nodeNeedsLightHeaderText(node) {
    var el = node;
    while (el && el !== document.body) {
      if (!isWorkCarouselBackdrop(el)) {
        el = el.parentElement;
        continue;
      }
      if (el.dataset && el.dataset.brand && darkBackdropBrands[el.dataset.brand]) {
        return true;
      }
      if (el.classList) {
        if (
          el.classList.contains('bento-card--meta') ||
          el.classList.contains('bento-card--square') ||
          el.classList.contains('bento-card--cash') ||
          el.classList.contains('bento-card--ogilvy') ||
          el.classList.contains('bento-card--f1-alexa')
        ) {
          return true;
        }
      }
      el = el.parentElement;
    }
    return false;
  }

  function hasDarkSurfaceBehind(node) {
    var el = node;
    while (el && el !== document.body) {
      var channels = parseColorChannels(getComputedStyle(el).backgroundColor);
      if (channels && channels.a > 0.35) {
        var lum = colorLuminance(channels.r, channels.g, channels.b);
        if (lum < 0.58) return true;
        if (lum > 0.82) return false;
      }
      el = el.parentElement;
    }
    return false;
  }

  function evaluateLightTextForElement(el) {
    if (!el) return false;

    if (el.closest('.experience, .work-section--side, .intro-screen')) {
      return hasDarkSurfaceBehind(el);
    }

    if (nodeNeedsLightHeaderText(el)) return true;
    return hasDarkSurfaceBehind(el);
  }

  function sampleNeedsLightTextAt(x, y, ignoreNodes, evaluator) {
    var ignores = ignoreNodes || [];
    var evaluate = evaluator || evaluateLightTextForElement;
    var saved = ignores.map(function(node) {
      return { node: node, pointerEvents: node.style.pointerEvents };
    });
    ignores.forEach(function(node) {
      node.style.pointerEvents = 'none';
    });
    var el = document.elementFromPoint(x, y);
    saved.forEach(function(item) {
      item.node.style.pointerEvents = item.pointerEvents || '';
    });
    return evaluate(el);
  }

  function updateSiteHeaderTone() {
    if (!siteHeader) return;
    if (!root.classList.contains('blurb-reveal-done')) {
      siteHeader.classList.remove('site-header--on-dark');
      return;
    }
    if (body.classList.contains('brand-active')) {
      siteHeader.classList.add('site-header--on-dark');
      return;
    }
    if (!siteHeaderTitle) return;

    var rect = siteHeaderTitle.getBoundingClientRect();
    var sampleXs = [
      rect.left + rect.width * 0.22,
      rect.left + rect.width * 0.5,
      rect.left + rect.width * 0.78
    ];
    var useLightText = false;
    for (var i = 0; i < sampleXs.length; i++) {
      var y = rect.top + rect.height * 0.5;
      if (sampleNeedsLightTextAt(sampleXs[i], y, [siteHeaderTitle])) {
        useLightText = true;
        break;
      }
    }
    siteHeader.classList.toggle('site-header--on-dark', useLightText);
  }

  var headerToneRefreshTimer = null;

  function scheduleSiteHeaderToneRefresh() {
    if (typeof updateSiteHeaderTone !== 'function') return;
    if (headerToneRefreshTimer) clearTimeout(headerToneRefreshTimer);
    requestAnimationFrame(function() {
      updateSiteHeaderTone();
      updateFabTone();
    });
    [120, 280, 480].forEach(function(delay) {
      window.setTimeout(function() {
        updateSiteHeaderTone();
        updateFabTone();
      }, delay);
    });
    headerToneRefreshTimer = window.setTimeout(function() {
      headerToneRefreshTimer = null;
      updateSiteHeaderTone();
      updateFabTone();
    }, 520);
  }

  function updateScrollChrome() {
    updateScrollProgress();
    updateFabNav();
    updateSiteHeaderTone();
  }

  function getAnchorScrollOffset() {
    var header = document.querySelector('.site-header');
    var headerHeight = header ? header.getBoundingClientRect().height : 0;
    var extra = 8;
    if (headerHeight > 0) return headerHeight + extra;

    var rootStyles = getComputedStyle(document.documentElement);
    var cssOffset = parseFloat(rootStyles.getPropertyValue('--anchor-scroll-offset'));
    return Number.isFinite(cssOffset) ? cssOffset : 120;
  }

  function scrollToAnchor(target) {
    if (!target) return;
    var top = target.getBoundingClientRect().top + window.scrollY - getAnchorScrollOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function bindAnchorLinks(rootEl) {
    if (!rootEl) return;
    rootEl.querySelectorAll('a[href^="#"]').forEach(function(link) {
      var href = link.getAttribute('href');
      if (!href || href === '#') return;
      var id = href.slice(1);
      if (!id || !document.getElementById(id)) return;
      if (link.dataset.anchorScrollBound === 'true') return;
      link.dataset.anchorScrollBound = 'true';

      link.addEventListener('click', function(e) {
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        scrollToAnchor(target);
      });
    });
  }

  bindAnchorLinks(fabNav);
  bindAnchorLinks(document.getElementById('sidebarNav'));

  var scrollChromeRaf = false;
  var lastHeaderToneAt = 0;
  var headerToneSettleTimer = null;
  function onScrollChrome() {
    if (!scrollChromeRaf) {
      scrollChromeRaf = true;
      requestAnimationFrame(function() {
        scrollChromeRaf = false;
        updateScrollProgress();
        updateFabNav();
        // Header-tone sampling does elementFromPoint x3 + style reads, which is
        // too heavy to run every scroll frame on mobile. Throttle it during the
        // scroll and settle it once scrolling pauses.
        var toneThrottle = mqMobileIntro.matches ? 200 : 110;
        var now = performance.now();
        if (now - lastHeaderToneAt >= toneThrottle) {
          lastHeaderToneAt = now;
          updateSiteHeaderTone();
        }
      });
    }
    if (headerToneSettleTimer) clearTimeout(headerToneSettleTimer);
    headerToneSettleTimer = setTimeout(function() {
      headerToneSettleTimer = null;
      lastHeaderToneAt = performance.now();
      updateSiteHeaderTone();
    }, 140);
  }
  window.addEventListener('scroll', onScrollChrome, { passive: true });
  window.addEventListener('resize', function() {
    requestAnimationFrame(updateScrollChrome);
  });
  if (root.classList.contains('blurb-reveal-done') || !mqMobileIntro.matches) {
    updateScrollChrome();
  }

  var footerCopyright = document.querySelector('.footer-copyright');
  var footerEl = footerCopyright ? footerCopyright.closest('.footer') : null;

  function fitFooterCopyright() {
    if (!footerCopyright || !footerEl) return;
    footerCopyright.style.fontSize = '4rem';

    var footerStyle = getComputedStyle(footerEl);
    var padX = (parseFloat(footerStyle.paddingLeft) || 0) + (parseFloat(footerStyle.paddingRight) || 0);
    var available = footerEl.clientWidth - padX;
    if (!available) return;

    var size = parseFloat(getComputedStyle(footerCopyright).fontSize) || 64;
    var textWidth = footerCopyright.scrollWidth;
    if (!textWidth) return;

    size *= available / textWidth;
    footerCopyright.style.fontSize = size + 'px';

    // One refinement pass after layout settles
    requestAnimationFrame(function() {
      var refined = parseFloat(getComputedStyle(footerCopyright).fontSize) || size;
      var measured = footerCopyright.scrollWidth;
      if (measured > 0) {
        footerCopyright.style.fontSize = (refined * (available / measured)) + 'px';
      }
    });
  }

  function bootFooterFit() {
    fitFooterCopyright();
    window.addEventListener('resize', function() {
      requestAnimationFrame(fitFooterCopyright);
    });
    window.addEventListener('load', fitFooterCopyright);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitFooterCopyright);
    }
  }

  if (mqMobileIntro.matches && !root.classList.contains('blurb-reveal-done')) {
    window.addEventListener('blurb-reveal-complete', function() {
      setTimeout(bootFooterFit, 1100);
    }, { once: true });
  } else {
    bootFooterFit();
  }

  window.addEventListener('blurb-reveal-complete', function() {
    if (mqMobileIntro.matches) {
      setTimeout(function() {
        requestAnimationFrame(updateScrollChrome);
      }, 1040);
      return;
    }
    requestAnimationFrame(updateScrollChrome);
  });

  /* ----- Phone call overlay (bottom-of-page trigger; max once per cooldown) ----- */
  var callOverlay = document.getElementById('callOverlay');
  var callDecline = document.getElementById('callDecline');
  var callAccept = document.getElementById('callAccept');
  var callScreenIncoming = document.getElementById('callScreenIncoming');
  var callScreenMessage = document.getElementById('callScreenMessage');
  var callCloseMsg = document.getElementById('callCloseMsg');
  var forceCallTest = false;
  var callDebug = false;
  try {
    var qs = new URLSearchParams(window.location.search);
    forceCallTest = qs.has('calltest');
    callDebug = qs.has('calldebug');
  } catch (e) {}

  var CALL_OVERLAY_COOLDOWN_MS = 30000;
  var lastCallOverlayActivationAt = 0;

  function showCallOverlay() {
    if (!callOverlay) return;
    // Allow re-showing; only block if already visible.
    if (callOverlay.classList.contains('call-visible')) return;
    /* Bottom-trigger path: at most one activation every 30s (calltest bypasses for QA). */
    if (!forceCallTest) {
      var now = Date.now();
      if (lastCallOverlayActivationAt > 0 && now - lastCallOverlayActivationAt < CALL_OVERLAY_COOLDOWN_MS) {
        return;
      }
    }
    callOverlay.classList.remove('call-closing');
    callOverlay.classList.remove('call-message-open');
    // Always start on the incoming screen
    if (callScreenIncoming) {
      callScreenIncoming.hidden = false;
      callScreenIncoming.style.display = '';
      callScreenIncoming.classList.remove('call-exiting');
    }
    if (callScreenMessage) {
      callScreenMessage.hidden = true;
      callScreenMessage.style.display = 'none';
    }
    callOverlay.hidden = false;
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        callOverlay.classList.add('call-visible');
      });
    });
    lastCallOverlayActivationAt = Date.now();
    try { console.log('[call-overlay] show', { incomingHidden: !!(callScreenIncoming && callScreenIncoming.hidden), messageHidden: !!(callScreenMessage && callScreenMessage.hidden) }); } catch (e) {}
  }

  function hideCallOverlay() {
    if (!callOverlay) return;
    // Dialog out first…
    callOverlay.classList.add('call-closing');
    setTimeout(function() {
      // …then backdrop fade
      callOverlay.classList.remove('call-visible');
    }, 320);
    setTimeout(function() {
      callOverlay.hidden = true;
      callOverlay.classList.remove('call-closing');
      callOverlay.classList.remove('call-message-open');
      if (callScreenIncoming) {
        callScreenIncoming.hidden = false;
        callScreenIncoming.style.display = '';
        callScreenIncoming.classList.remove('call-exiting');
      }
      if (callScreenMessage) {
        callScreenMessage.hidden = true;
        callScreenMessage.style.display = 'none';
      }
    }, 700);
    try { console.log('[call-overlay] hide'); } catch (e) {}
  }

  if (callOverlay) {
    if (forceCallTest) {
      setTimeout(showCallOverlay, 2000);
    } else {
      var isMobile = false;
      try {
        isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
      } catch (e) {}

      function reachedBottom() {
        var doc = document.documentElement;
        var body = document.body;
        var scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
        var viewportH = window.innerHeight || doc.clientHeight || 0;
        // Some browsers report different heights depending on overflow/layout; take the max.
        var docH = Math.max(
          doc.scrollHeight, doc.offsetHeight, doc.clientHeight,
          body ? body.scrollHeight : 0,
          body ? body.offsetHeight : 0
        );
        // Trigger when within ~120px of bottom (covers iOS bounce + rounding + sticky chrome)
        var atBottom = (scrollTop + viewportH) >= (docH - 120);
        if (callDebug) {
          try {
            console.log('[call-overlay] bottom-check', { scrollTop: Math.round(scrollTop), viewportH: Math.round(viewportH), docH: Math.round(docH), atBottom: atBottom, visible: callOverlay && callOverlay.classList.contains('call-visible') });
          } catch (e) {}
        }
        return atBottom;
      }

      function maybeShowAtBottom() {
        // Mobile has an intro state where most sections are hidden; don't trigger until full site is revealed.
        if (!document.documentElement.classList.contains('blurb-reveal-done')) return;
        if (callOverlay && callOverlay.classList.contains('call-visible')) return;
        if (reachedBottom()) showCallOverlay();
      }

      function armBottomTrigger() {
        var rafPending = false;
        window.addEventListener('scroll', function() {
          if (rafPending) return;
          rafPending = true;
          requestAnimationFrame(function() {
            rafPending = false;
            maybeShowAtBottom();
          });
        }, { passive: true });
        window.addEventListener('resize', maybeShowAtBottom);
        setTimeout(maybeShowAtBottom, 0);

        if (typeof IntersectionObserver !== 'undefined' && footerEl) {
          var footerBottomObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
              if (entry.isIntersecting) maybeShowAtBottom();
            });
          }, { root: null, rootMargin: '0px 0px 120px 0px', threshold: 0 });
          footerBottomObserver.observe(footerEl);
        }
      }

      if (!document.documentElement.classList.contains('blurb-reveal-done')) {
        window.addEventListener('blurb-reveal-complete', armBottomTrigger, { once: true });
      } else {
        armBottomTrigger();
      }
    }

    if (callDebug) {
      try {
        console.log('[call-overlay] init', {
          overlay: !!callOverlay,
          decline: !!callDecline,
          accept: !!callAccept,
          incoming: !!callScreenIncoming,
          message: !!callScreenMessage,
          closeMsg: !!callCloseMsg
        });
      } catch (e) {}
      document.addEventListener('click', function(e) {
        try { console.log('[doc click]', e.target); } catch (err) {}
      }, true);
      callOverlay.addEventListener('click', function(e) {
        try { console.log('[overlay click]', { target: e.target, currentTarget: e.currentTarget }); } catch (err) {}
      }, true);
    }

    if (callDecline) {
      callDecline.addEventListener('click', function(e) {
        if (callDebug) {
          try { console.log('[call-overlay] decline click', e.target); } catch (err) {}
        }
        hideCallOverlay();
      });
    }

    if (callAccept) {
      callAccept.addEventListener('click', function(e) {
        if (callDebug) {
          try { console.log('[call-overlay] accept click', e.target); } catch (err) {}
        }
        if (callScreenMessage) {
          callScreenMessage.hidden = false;
          callScreenMessage.style.display = '';
        }
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            callOverlay.classList.add('call-message-open');
          });
        });
        setTimeout(function() {
          if (callScreenIncoming) {
            callScreenIncoming.hidden = true;
            callScreenIncoming.style.display = 'none';
          }
        }, 480);
      });
    }

    if (callCloseMsg) {
      callCloseMsg.addEventListener('click', function(e) {
        if (callDebug) {
          try { console.log('[call-overlay] close message click', e.target); } catch (err) {}
        }
        hideCallOverlay();
      });
    }

    callOverlay.addEventListener('click', function(e) {
      if (e.target === callOverlay) hideCallOverlay();
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') hideCallOverlay();
    });
  }

  (function initBlurbNameCursor() {
    if (!window.matchMedia('(hover: hover)').matches) return;

    var follower = document.getElementById('blurbNameCursorFollower');
    if (!follower) return;

    var active = false;
    var rafId = null;
    var x = 0;
    var y = 0;
    var targetSelector = '.blurb-name-cursor, .blurb-wave';

    function isTarget(node) {
      return !!(node && node.closest && node.closest(targetSelector));
    }

    function setPosition(clientX, clientY) {
      x = clientX;
      y = clientY;
      if (rafId) return;
      rafId = requestAnimationFrame(function() {
        follower.style.left = x + 'px';
        follower.style.top = y + 'px';
        rafId = null;
      });
    }

    function show(clientX, clientY) {
      active = true;
      follower.hidden = false;
      follower.classList.add('is-visible');
      setPosition(clientX, clientY);
    }

    function hide() {
      active = false;
      follower.classList.remove('is-visible');
      follower.hidden = true;
    }

    document.addEventListener('mouseover', function(e) {
      if (!isTarget(e.target)) return;
      show(e.clientX, e.clientY);
    });

    document.addEventListener('mouseout', function(e) {
      if (!isTarget(e.target)) return;
      var related = e.relatedTarget;
      if (isTarget(related)) return;
      hide();
    });

    document.addEventListener('mousemove', function(e) {
      if (!active) return;
      setPosition(e.clientX, e.clientY);
    });
  })();

  (function initHoverRainEffects() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var ANIMATION_NAME = 'media-rain-fall';
    var PROFILE_SRC = 'assets/profile-cursor.png';
    var FLAG = '\uD83C\uDDE8\uD83C\uDDE6';
    var RAIN_MS = 3000;
    var SPAWN_MS = 48;
    var BURST_COUNT = 36;

    function rand(min, max) {
      return min + Math.random() * (max - min);
    }

    function pickTier(tiers) {
      var roll = Math.random();
      if (roll < 0.35) return tiers[0];
      if (roll < 0.7) return tiers[1];
      return tiers[2];
    }

    function styleDrop(drop, tier) {
      var size = rand(tier.size[0], tier.size[1]);
      var duration = rand(tier.duration[0], tier.duration[1]);
      var opacity = rand(tier.opacity[0], tier.opacity[1]);

      drop.style.left = rand(-4, window.innerWidth + 4) + 'px';
      drop.style.setProperty('--drift', rand(-48, 48) + 'px');
      drop.style.setProperty('--spin', rand(-220, 220) + 'deg');
      drop.style.setProperty('--drop-opacity', opacity.toFixed(2));
      drop.style.animationDuration = duration + 's';
      drop.style.animationDelay = rand(0, 0.45) + 's';
      drop.style.zIndex = String(tier.zIndex);

      return { size: size, duration: duration };
    }

    function createRainEffect(config) {
      var layer = null;
      var spawnTimer = null;
      var stopTimer = null;
      var cleanupTimer = null;
      var raining = false;
      var dropCount = 0;

      function getLayer() {
        if (layer) return layer;
        layer = document.createElement('div');
        layer.className = 'media-rain-layer';
        layer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(layer);
        return layer;
      }

      function spawnDrop() {
        if (dropCount >= config.maxDrops) return;

        var tier = pickTier(config.tiers);
        var drop = config.buildDrop(tier, rand, styleDrop);
        getLayer().appendChild(drop);
        dropCount += 1;

        drop.addEventListener('animationend', function(e) {
          if (e.animationName !== ANIMATION_NAME) return;
          drop.remove();
          dropCount = Math.max(0, dropCount - 1);
          maybeRemoveLayer();
        });
      }

      function spawnWave(count) {
        for (var i = 0; i < count; i += 1) {
          spawnDrop();
        }
      }

      function maybeRemoveLayer() {
        if (raining || !layer || layer.childElementCount > 0) return;
        layer.classList.remove('is-active');
        var node = layer;
        layer = null;
        window.setTimeout(function() {
          node.remove();
        }, 400);
      }

      function stopSpawning() {
        raining = false;
        if (spawnTimer) {
          clearInterval(spawnTimer);
          spawnTimer = null;
        }
        if (stopTimer) {
          clearTimeout(stopTimer);
          stopTimer = null;
        }
        if (cleanupTimer) {
          clearTimeout(cleanupTimer);
        }
        cleanupTimer = setTimeout(maybeRemoveLayer, 6000);
      }

      function startRain() {
        getLayer().classList.add('is-active');
        if (cleanupTimer) {
          clearTimeout(cleanupTimer);
          cleanupTimer = null;
        }

        if (raining) {
          if (stopTimer) clearTimeout(stopTimer);
          stopTimer = setTimeout(stopSpawning, RAIN_MS);
          spawnWave(14);
          return;
        }

        raining = true;
        spawnWave(BURST_COUNT);
        spawnTimer = setInterval(function() {
          if (!raining) return;
          spawnWave(Math.random() < 0.35 ? 3 : 2);
        }, SPAWN_MS);
        stopTimer = setTimeout(stopSpawning, RAIN_MS);
      }

      document.querySelectorAll(config.trigger).forEach(function(el) {
        el.addEventListener('mouseenter', startRain);
      });
    }

    var flagTiers = [
      { size: [12, 22], duration: [1.6, 2.4], opacity: [0.55, 0.75], zIndex: 3 },
      { size: [24, 40], duration: [2.2, 3.2], opacity: [0.7, 0.88], zIndex: 2 },
      { size: [44, 76], duration: [3, 4.6], opacity: [0.82, 0.98], zIndex: 1 }
    ];

    var profileTiers = [
      { size: [20, 34], duration: [1.6, 2.4], opacity: [0.55, 0.75], zIndex: 3 },
      { size: [36, 54], duration: [2.2, 3.2], opacity: [0.7, 0.88], zIndex: 2 },
      { size: [56, 88], duration: [3, 4.6], opacity: [0.82, 0.98], zIndex: 1 }
    ];

    createRainEffect({
      trigger: '.vancouver-flag-rain',
      maxDrops: 220,
      tiers: flagTiers,
      buildDrop: function(tier, randFn, applyStyle) {
        var drop = document.createElement('span');
        drop.className = 'media-rain-drop vancouver-flag-rain-drop';
        var styled = applyStyle(drop, tier);
        drop.style.fontSize = styled.size + 'px';
        drop.textContent = FLAG;
        return drop;
      }
    });

    createRainEffect({
      trigger: '.alex-profile-rain',
      maxDrops: 180,
      tiers: profileTiers,
      buildDrop: function(tier, randFn, applyStyle) {
        var drop = document.createElement('span');
        drop.className = 'media-rain-drop alex-profile-rain-drop';
        var styled = applyStyle(drop, tier);
        drop.style.width = styled.size + 'px';
        drop.style.height = styled.size + 'px';
        var img = document.createElement('img');
        img.src = PROFILE_SRC;
        img.alt = '';
        img.decoding = 'async';
        drop.appendChild(img);
        return drop;
      }
    });
  })();

  (function initAssetLightbox() {
    var lightbox = document.getElementById('assetLightbox');
    var track = document.getElementById('assetLightboxTrack');
    var scroller = document.getElementById('assetLightboxScroller');
    var closeBtn = document.getElementById('assetLightboxClose');
    if (!lightbox || !track || !scroller || !closeBtn) return;

    var lastFocus = null;
    var lightboxVideos = [];

    function getMediaFromCard(card) {
      var video = card.querySelector('video');
      if (video) {
        var videoSrc = video.getAttribute('src') || video.getAttribute('data-src');
        if (!videoSrc) return null;
        return {
          type: 'video',
          src: videoSrc,
          label: video.getAttribute('aria-label') || 'Project video',
          flow: card.classList.contains('card-stack-card--flow'),
          featured: card.classList.contains('side-project-video-trigger')
        };
      }

      var img = card.querySelector('img');
      if (!img) return null;
      var imgSrc = img.getAttribute('src') || img.getAttribute('data-src');
      if (!imgSrc) return null;
      return {
        type: 'image',
        src: imgSrc,
        label: img.getAttribute('alt') || 'Project image',
        flow: card.classList.contains('card-stack-card--flow'),
        featured: false
      };
    }

    function getMediaFromVideo(video) {
      if (!video) return null;
      var videoSrc = video.getAttribute('src') || video.getAttribute('data-src');
      if (!videoSrc) return null;
      return {
        type: 'video',
        src: videoSrc,
        label: video.getAttribute('aria-label') || 'Project video',
        flow: false,
        featured: true
      };
    }

    function pauseLightboxVideos() {
      lightboxVideos.forEach(function(video) {
        video.pause();
      });
      lightboxVideos = [];
    }

    function syncLightboxUnmuteButton(video, button) {
      if (!button) return;
      button.hidden = !video.muted;
      button.setAttribute('aria-pressed', video.muted ? 'false' : 'true');
    }

    function bindLightboxUnmuteButton(video, button) {
      syncLightboxUnmuteButton(video, button);

      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        video.muted = false;
        video.volume = 1;
        video.play().catch(function() {});
        syncLightboxUnmuteButton(video, button);
      });

      video.addEventListener('volumechange', function() {
        syncLightboxUnmuteButton(video, button);
      });
    }

    function bindLightboxVideoLoop(video) {
      video.loop = true;
      video.setAttribute('loop', '');

      video.addEventListener('ended', function() {
        video.currentTime = 0;
        video.play().catch(function() {});
      });
    }

    function playLightboxVideo(video) {
      video.muted = true;
      video.volume = 1;
      video.defaultMuted = true;

      function startPlayback() {
        video.play().catch(function() {});
      }

      if (video.readyState >= 2) {
        startPlayback();
        return;
      }

      video.addEventListener('canplay', startPlayback, { once: true });
    }

    function closeLightbox() {
      if (lightbox.hidden) return;
      pauseLightboxVideos();
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      body.style.overflow = '';
      track.innerHTML = '';

      window.setTimeout(function() {
        if (!lightbox.classList.contains('is-open')) {
          lightbox.hidden = true;
        }
      }, 320);

      if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus();
      }
      lastFocus = null;
    }

    function resolveSourceStack(stackEl) {
      var slide = stackEl.closest('.carousel-slide');
      if (!slide || !slide.classList.contains('carousel-slide--clone')) return stackEl;

      var card = slide.querySelector('.bento-card, .side-project-card');
      if (!card) return stackEl;

      var title = card.querySelector('.bento-card-title');
      var titleText = title ? title.textContent.trim() : '';
      var carousel = slide.closest('.carousel');
      if (!carousel || !titleText) return stackEl;

      var sourceSlides = carousel.querySelectorAll('.carousel-slide:not(.carousel-slide--clone)');
      var i = sourceSlides.length;
      while (i--) {
        var sourceCard = sourceSlides[i].querySelector('.bento-card, .side-project-card');
        if (!sourceCard) continue;
        var sourceTitle = sourceCard.querySelector('.bento-card-title');
        if (!sourceTitle || sourceTitle.textContent.trim() !== titleText) continue;
        var sourceStack = sourceCard.querySelector('.card-stack--interactive');
        if (sourceStack) return sourceStack;
      }

      return stackEl;
    }

    function openLightboxWithItems(items, focusIndex) {
      if (!items.length) return;

      pauseLightboxVideos();

      focusIndex = focusIndex || 0;
      if (focusIndex < 0) focusIndex = 0;
      if (focusIndex >= items.length) focusIndex = items.length - 1;

      lastFocus = document.activeElement;
      track.innerHTML = '';

      items.forEach(function(item) {
        var figure = document.createElement('figure');
        figure.className = 'asset-lightbox-item' + (item.flow ? ' asset-lightbox-item--flow' : '');

        if (item.type === 'video') {
          figure.classList.add('asset-lightbox-item--video');
          if (item.featured) figure.classList.add('asset-lightbox-item--featured');

          var video = document.createElement('video');
          video.src = item.src;
          video.muted = true;
          video.playsInline = true;
          video.preload = 'auto';
          video.controls = true;
          video.setAttribute('aria-label', item.label);
          bindLightboxVideoLoop(video);

          var unmuteBtn = document.createElement('button');
          unmuteBtn.type = 'button';
          unmuteBtn.className = 'asset-lightbox-unmute';
          unmuteBtn.setAttribute('aria-label', 'Turn on sound');
          unmuteBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4V5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Sound off</span>';

          figure.appendChild(video);
          figure.appendChild(unmuteBtn);
          bindLightboxUnmuteButton(video, unmuteBtn);
          lightboxVideos.push(video);
        } else {
          var img = document.createElement('img');
          img.src = item.src;
          img.alt = item.label;
          img.decoding = 'async';
          figure.appendChild(img);
        }

        track.appendChild(figure);
      });

      lightbox.hidden = false;
      lightbox.setAttribute('aria-hidden', 'false');
      body.style.overflow = 'hidden';
      requestAnimationFrame(function() {
        lightbox.classList.add('is-open');
      });

      var targetItem = track.children[focusIndex];
      if (targetItem) {
        requestAnimationFrame(function() {
          var scrollerRect = scroller.getBoundingClientRect();
          var itemRect = targetItem.getBoundingClientRect();
          var offset = (itemRect.left + itemRect.width / 2) - (scrollerRect.left + scrollerRect.width / 2);
          scroller.scrollLeft += offset;
        });
      }

      lightboxVideos.forEach(function(video, index) {
        if (index === focusIndex) {
          playLightboxVideo(video);
        } else {
          video.pause();
          video.preload = 'metadata';
        }
      });

      closeBtn.focus();
    }

    function resolveSourceSideProjectVideoTrigger(trigger) {
      var slide = trigger.closest('.carousel-slide');
      if (!slide || !slide.classList.contains('carousel-slide--clone')) return trigger;

      var card = slide.querySelector('.side-project-card');
      if (!card) return trigger;

      var projectId = card.getAttribute('data-side-project');
      var title = getCarouselCardTitle(card);
      var carousel = slide.closest('.carousel');
      if (!carousel) return trigger;

      var sourceSlides = carousel.querySelectorAll('.carousel-slide:not(.carousel-slide--clone)');
      var i = sourceSlides.length;
      while (i--) {
        var sourceCard = sourceSlides[i].querySelector('.side-project-card');
        if (!sourceCard) continue;
        if (projectId && sourceCard.getAttribute('data-side-project') !== projectId) continue;
        if (!projectId) {
          var sourceTitle = getCarouselCardTitle(sourceCard);
          if (sourceTitle !== title) continue;
        }
        var sourceTrigger = sourceCard.querySelector('.side-project-video-trigger');
        if (sourceTrigger) return sourceTrigger;
      }

      return trigger;
    }

    function openLightbox(stackEl, focusCard) {
      var sourceStack = resolveSourceStack(stackEl);
      var cards = sourceStack.querySelectorAll('.card-stack-card');
      if (!cards.length) return;

      var items = [];
      cards.forEach(function(card) {
        var media = getMediaFromCard(card);
        if (media) items.push(media);
      });
      if (!items.length) return;

      var focusIndex = 0;
      if (focusCard) {
        var clickedCards = stackEl.querySelectorAll('.card-stack-card');
        var cardIndex = Array.prototype.indexOf.call(clickedCards, focusCard);
        if (cardIndex >= 0) focusIndex = cardIndex;
      }

      openLightboxWithItems(items, focusIndex);
    }

    function openSideProjectVideo(trigger) {
      var sourceTrigger = resolveSourceSideProjectVideoTrigger(trigger);
      var video = sourceTrigger.querySelector('video');
      var media = getMediaFromVideo(video);
      if (!media) return;
      openLightboxWithItems([media], 0);
    }

    function bindInteractiveStack(stackEl) {
      if (stackEl.dataset.lightboxBound === 'true') return;
      stackEl.dataset.lightboxBound = 'true';

      stackEl.addEventListener('mousedown', function(e) {
        e.stopPropagation();
      });

      stackEl.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var card = e.target.closest('.card-stack-card');
        openLightbox(stackEl, card && stackEl.contains(card) ? card : null);
      });

      stackEl.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        openLightbox(stackEl, null);
      });
    }

    document.querySelectorAll('.card-stack--interactive').forEach(bindInteractiveStack);

    function bindSideProjectVideoTrigger(trigger) {
      if (trigger.dataset.sideProjectVideoBound === 'true') return;
      trigger.dataset.sideProjectVideoBound = 'true';

      trigger.addEventListener('mousedown', function(e) {
        e.stopPropagation();
      });

      function activate(e) {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        e.stopPropagation();
        openSideProjectVideo(trigger);
      }

      trigger.addEventListener('click', activate);
      trigger.addEventListener('keydown', activate);
    }

    document.querySelectorAll('.side-project-video-trigger').forEach(bindSideProjectVideoTrigger);

    closeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      closeLightbox();
    });

    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape' || lightbox.hidden) return;
      closeLightbox();
    });
  })();
})();
