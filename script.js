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

  /* ----- Main blurb typewriter (runs early so a later error never blocks transition to full site) ----- */
  const mqMobileIntro = window.matchMedia('(max-width: 768px)');
  const reduceMotionIntro = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function finishMobileIntro() {
    root.classList.add('mobile-intro-done');
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        window.dispatchEvent(new Event('resize'));
      });
    });
    setTimeout(function() {
      window.dispatchEvent(new Event('resize'));
    }, 2600);
  }

  const blurbEl = document.querySelector('.main-blurb');
  if (blurbEl) {
    const raw = blurbEl.innerHTML;
    const source = raw.replace(/<br\s*\/?>/gi, '\n');
    blurbEl.innerHTML = '';
    blurbEl.classList.remove('main-blurb--loading');
    blurbEl.classList.add('main-blurb--typing');

    if (!mqMobileIntro.matches || reduceMotionIntro) {
      finishMobileIntro();
    }

    let index = 0;
    const CHAR_DELAY = 28;

    function typeNext() {
      if (index < source.length) {
        index += 1;
        blurbEl.innerHTML = source.slice(0, index).replace(/\n/g, '<br>');
        setTimeout(typeNext, CHAR_DELAY);
      } else {
        blurbEl.classList.remove('main-blurb--typing');
        /* Always finish when typing completes: avoids getting stuck if viewport crossed 768px during the animation (mq was true at start, false at end). */
        setTimeout(finishMobileIntro, mqMobileIntro.matches && !reduceMotionIntro ? 500 : 0);
      }
    }
    setTimeout(typeNext, CHAR_DELAY);
  } else {
    finishMobileIntro();
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

  if (navBurger && sidebarNav) {
    function setMenuOpen(open) {
      if (open) {
        clearTimeout(navBackdropHideTimer);
        if (navBackdrop) {
          navBackdrop.hidden = false;
          navBackdrop.setAttribute('aria-hidden', 'false');
        }
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            root.classList.add('nav-menu-open');
          });
        });
        navBurger.setAttribute('aria-expanded', 'true');
        navBurger.setAttribute('aria-label', 'Close menu');
      } else {
        root.classList.remove('nav-menu-open');
        navBurger.setAttribute('aria-expanded', 'false');
        navBurger.setAttribute('aria-label', 'Open menu');
        if (navBackdrop) {
          clearTimeout(navBackdropHideTimer);
          navBackdropHideTimer = setTimeout(function() {
            navBackdrop.hidden = true;
            navBackdrop.setAttribute('aria-hidden', 'true');
          }, 380);
        }
      }
    }

    navBurger.addEventListener('click', function() {
      setMenuOpen(!root.classList.contains('nav-menu-open'));
    });

    if (navBackdrop) {
      navBackdrop.addEventListener('click', function() {
        setMenuOpen(false);
      });
    }

    sidebarNav.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        setMenuOpen(false);
      });
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth > 768) setMenuOpen(false);
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

    document.querySelectorAll('.marquee-logo').forEach(img => {
      img.style.filter = 'invert(1)';
      img.style.opacity = '0.6';
    });
  }

  function removeBrand() {
    brandTimeout = setTimeout(() => {
      body.classList.remove('brand-active');
      body.style.background = '';

      const overrides = ['--bg-primary','--bg-card','--bg-card-hover','--text-primary','--text-secondary','--text-tertiary','--border-primary','--bg-tag','--placeholder-bg','--placeholder-text'];
      overrides.forEach(prop => root.style.removeProperty(prop));

      document.querySelectorAll('.marquee-logo').forEach(img => {
        img.style.filter = '';
        img.style.opacity = '';
      });
    }, 80);
  }

  var touchBrandStart = { x: 0, y: 0, t: 0, brand: null };
  var touchDidMove = false;

  document.querySelectorAll('[data-brand]').forEach(item => {
    if (item.closest('.experience')) return; // no theme change on experience cards
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
  });

  /* ----- Carousels (Selected Work + Side projects) ----- */
  function initCarousel(carouselEl, controlsEl, titleEl) {
    if (!carouselEl) return;

    const vpEl = carouselEl.querySelector('.carousel-viewport');
    if (!vpEl) return;

    vpEl.addEventListener('touchmove', function() { touchDidMove = true; }, { passive: true });
    const trackEl = carouselEl.querySelector('.carousel-track');
    const slideEls = carouselEl.querySelectorAll('.carousel-slide');
    const ctrlRoot = controlsEl || carouselEl;
    const prevBtn = ctrlRoot.querySelector('.carousel-btn--prev');
    const nextBtn = ctrlRoot.querySelector('.carousel-btn--next');
    const playBtn = ctrlRoot.querySelector('.carousel-btn--play');

    const count = slideEls.length;
    if (count === 0) return;

    let current = 0;
    let timer = null;
    let wasPlayingBeforeHover = false;
    const INTERVAL = 30000;

    function go(i) {
      current = ((i % count) + count) % count;

      if (!trackEl || !slideEls.length || !vpEl) return;

      var vpRect = vpEl.getBoundingClientRect();
      var refEl = titleEl || controlsEl;
      var refRect = refEl ? refEl.getBoundingClientRect() : vpRect;
      var headRect = controlsEl ? controlsEl.getBoundingClientRect() : vpRect;

      var contentLeft = refRect.left - vpRect.left;
      var contentRight = headRect.right - vpRect.left;

      var slideW = slideEls[0].offsetWidth;
      var gapVal = parseFloat(getComputedStyle(trackEl).gap) || 16;
      var step = slideW + gapVal;
      var totalW = count * slideW + (count - 1) * gapVal;

      var desired = contentLeft - current * step;

      var minTx = contentRight - totalW;

      var tx = Math.max(minTx, Math.min(desired, contentLeft));

      trackEl.style.transform = 'translate3d(' + tx + 'px, 0, 0)';

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

    if (prevBtn) prevBtn.addEventListener('click', function() { go(current - 1); stop(); });
    if (nextBtn) nextBtn.addEventListener('click', function() { go(current + 1); stop(); });
    if (playBtn) playBtn.addEventListener('click', function() {
      playBtn.getAttribute('data-playing') === 'true' ? stop() : play();
    });

    vpEl.addEventListener('mouseenter', function() {
      wasPlayingBeforeHover = !!timer;
      stop();
    });
    vpEl.addEventListener('mouseleave', function() {
      if (wasPlayingBeforeHover) play();
    });

    requestAnimationFrame(function() { go(0); });

    if (typeof IntersectionObserver !== 'undefined') {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            play();
          } else {
            stop();
          }
        });
      }, { threshold: 0.1, rootMargin: '0px' });
      observer.observe(carouselEl);
    } else {
      play();
    }

    var resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() { go(current); }, 100);
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
        if (deltaX > 0) go(current + 1);
        else go(current - 1);
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
        if (deltaX > 0) go(current + 1);
        else go(current - 1);
      }
    });
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

  /* ----- Floating action button (scroll hint) ----- */
  var fab = document.getElementById('fabScroll');
  if (fab) {
    var fabLabel = fab.querySelector('.fab-label');
    var sections = [
      { id: 'work', label: 'Selected Work' },
      { id: 'side-projects', label: 'Side projects & prototypes' },
      { id: 'experience', label: 'Experience' },
      { id: 'education', label: 'Education' }
    ];

    function getCurrentSectionIndex() {
      var vh = window.innerHeight;
      var viewportCenterY = window.scrollY + vh / 2;
      var currentIndex = -1;
      for (var i = 0; i < sections.length; i++) {
        var el = document.getElementById(sections[i].id);
        if (!el) continue;
        var rect = el.getBoundingClientRect();
        var docTop = rect.top + window.scrollY;
        var passedTop = viewportCenterY >= docTop;
        var headingVisible = rect.top >= -20 && rect.top <= vh * 0.6;
        if (passedTop || headingVisible) currentIndex = i;
      }
      return currentIndex;
    }

    function getNextSection() {
      var currentIndex = getCurrentSectionIndex();
      var nextIndex = currentIndex + 1;
      if (nextIndex >= sections.length) return null;
      var section = sections[nextIndex];
      var el = document.getElementById(section.id);
      if (!el) return null;
      return { el: el, section: section };
    }

    function updateFab() {
      var next = getNextSection();
      if (!next) {
        fab.classList.add('fab-hidden');
        fab.classList.remove('fab-levitate');
        return;
      }
      fab.classList.remove('fab-hidden');
      fab.href = '#' + next.section.id;
      if (fabLabel) fabLabel.textContent = next.section.label;
      fab.setAttribute('aria-label', 'Scroll to ' + next.section.label);
      if (fabLabel && fabLabel.textContent === 'Selected Work') {
        fab.classList.add('fab-levitate');
      } else {
        fab.classList.remove('fab-levitate');
      }
    }

    fab.addEventListener('click', function(e) {
      var next = getNextSection();
      if (!next) return;
      e.preventDefault();
      next.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    window.addEventListener('scroll', function() {
      requestAnimationFrame(updateFab);
    }, { passive: true });
    window.addEventListener('resize', function() {
      requestAnimationFrame(updateFab);
    });
    updateFab();
  }

  /* ----- Phone call overlay (appears after 30s on the page) ----- */
  var callOverlay = document.getElementById('callOverlay');
  var callDecline = document.getElementById('callDecline');
  var callAccept = document.getElementById('callAccept');
  var callScreenIncoming = document.getElementById('callScreenIncoming');
  var callScreenMessage = document.getElementById('callScreenMessage');
  var callCloseMsg = document.getElementById('callCloseMsg');
  var CALL_SHOWN_KEY = 'call_overlay_shown';
  var forceCallTest = false;
  try {
    forceCallTest = new URLSearchParams(window.location.search).has('calltest');
    if (forceCallTest) sessionStorage.removeItem(CALL_SHOWN_KEY);
  } catch (e) {}

  function showCallOverlay() {
    if (!callOverlay) return;
    if (!forceCallTest && sessionStorage.getItem(CALL_SHOWN_KEY)) return;
    sessionStorage.setItem(CALL_SHOWN_KEY, '1');
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
      function reachedBottom() {
        var doc = document.documentElement;
        var scrollTop = window.scrollY || doc.scrollTop || 0;
        var viewportH = window.innerHeight || doc.clientHeight || 0;
        var docH = Math.max(doc.scrollHeight, doc.offsetHeight, doc.clientHeight);
        // Trigger when within 40px of bottom (covers iOS bounce rounding)
        return (scrollTop + viewportH) >= (docH - 40);
      }

      function maybeShowAtBottom() {
        if (sessionStorage.getItem(CALL_SHOWN_KEY)) return;
        if (reachedBottom()) showCallOverlay();
      }

      window.addEventListener('scroll', function() {
        // cheap guard; showCallOverlay itself is idempotent
        maybeShowAtBottom();
      }, { passive: true });
      window.addEventListener('resize', maybeShowAtBottom);
      // In case they land deep-linked near the bottom
      setTimeout(maybeShowAtBottom, 0);
    }

    // Debug: see if clicks reach the right elements
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

    if (callDecline) {
      callDecline.addEventListener('click', function(e) {
        try { console.log('[call-overlay] decline click', e.target); } catch (err) {}
        hideCallOverlay();
      });
    }

    if (callAccept) {
      callAccept.addEventListener('click', function(e) {
        try { console.log('[call-overlay] accept click', e.target); } catch (err) {}
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
        try { console.log('[call-overlay] close message click', e.target); } catch (err) {}
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
})();
