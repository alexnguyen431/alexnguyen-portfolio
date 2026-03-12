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

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (localStorage.getItem('theme') !== 'light' && localStorage.getItem('theme') !== 'dark') {
      root.setAttribute('data-theme', e.matches ? 'light' : 'dark');
    }
  });

  toggle.addEventListener('click', () => {
    const current = root.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

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

  document.querySelectorAll('[data-brand]').forEach(item => {
    if (item.closest('.experience')) return; // no theme change on experience cards
    item.addEventListener('mouseenter', () => applyBrand(item.dataset.brand));
    item.addEventListener('mouseleave', removeBrand);
    item.addEventListener('touchstart', (e) => {
      if (item.classList.contains('marquee-item')) e.preventDefault();
      applyBrand(item.dataset.brand);
      setTimeout(removeBrand, 2000);
    }, { passive: false });
  });

  /* ----- Carousel (Selected Work) ----- */
  const carouselEl = document.getElementById('workCarousel');
  const controlsEl = document.getElementById('workCarouselControls');

  if (carouselEl) {
    const vpEl = carouselEl.querySelector('.carousel-viewport');
    const trackEl = carouselEl.querySelector('.carousel-track');
    const slideEls = carouselEl.querySelectorAll('.carousel-slide');
    const ctrlRoot = controlsEl || carouselEl;
    const prevBtn = ctrlRoot.querySelector('.carousel-btn--prev');
    const nextBtn = ctrlRoot.querySelector('.carousel-btn--next');
    const playBtn = ctrlRoot.querySelector('.carousel-btn--play');

    const count = slideEls.length;
    let current = 0;
    let timer = null;
    let wasPlayingBeforeHover = false;
    const INTERVAL = 30000;

    var titleEl = document.getElementById('work');

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

    if (vpEl) {
      vpEl.addEventListener('mouseenter', function() {
        wasPlayingBeforeHover = !!timer;
        stop();
      });
      vpEl.addEventListener('mouseleave', function() {
        if (wasPlayingBeforeHover) play();
      });
    }

    requestAnimationFrame(function() { go(0); });

    /* Start autoplay only when carousel is in view */
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          play();
        } else {
          stop();
        }
      });
    }, { threshold: 0.1, rootMargin: '0px' });
    observer.observe(carouselEl);

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

  /* ----- Floating action button (scroll hint) ----- */
  var fab = document.getElementById('fabScroll');
  if (fab) {
    var fabLabel = fab.querySelector('.fab-label');
    var sections = [
      { id: 'work', label: 'Selected Work' },
      { id: 'experience', label: 'Experience' },
      { id: 'advisory', label: 'Advisory & Side Ventures' },
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
        return;
      }
      fab.classList.remove('fab-hidden');
      fab.href = '#' + next.section.id;
      if (fabLabel) fabLabel.textContent = next.section.label;
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

  /* ----- Main blurb typewriter (ChatGPT-style loading) ----- */
  const blurbEl = document.querySelector('.main-blurb');
  if (blurbEl) {
    const raw = blurbEl.innerHTML;
    const source = raw.replace(/<br\s*\/?>/gi, '\n');
    blurbEl.innerHTML = '';
    blurbEl.classList.remove('main-blurb--loading');
    blurbEl.classList.add('main-blurb--typing');

    let index = 0;
    const CHAR_DELAY = 28;

    function typeNext() {
      if (index < source.length) {
        index += 1;
        blurbEl.innerHTML = source.slice(0, index).replace(/\n/g, '<br>');
        setTimeout(typeNext, CHAR_DELAY);
      } else {
        blurbEl.classList.remove('main-blurb--typing');
      }
    }
    setTimeout(typeNext, CHAR_DELAY);
  }
})();
