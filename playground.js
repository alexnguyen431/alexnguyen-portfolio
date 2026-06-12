(function () {
  'use strict';

  var PLAYGROUND_ITEMS = [
    { src: 'assets/meta-1.png', type: 'image', aspect: 3 / 4, alt: 'Meta Shops — product detail' },
    { src: 'assets/meta-add-to-cart-walkthrough.mov', type: 'video', poster: 'assets/meta-1.png', aspect: 3 / 4, alt: 'Meta Shops — add to cart walkthrough' },
    { src: 'assets/meta-2.png', type: 'image', aspect: 3 / 4, alt: 'Meta Shops — cart' },
    { src: 'assets/meta-cart-signals-walkthrough.mov', type: 'video', poster: 'assets/meta-3.png', aspect: 3 / 4, alt: 'Meta Shops — cart signals walkthrough' },
    { src: 'assets/meta-3.png', type: 'image', aspect: 3 / 4, alt: 'Meta Shops — checkout' },
    { src: 'assets/meta-shop-1.png', type: 'image', aspect: 3 / 4, alt: 'Complete the Look — outfit carousel' },
    { src: 'assets/meta-shop-2.png', type: 'image', aspect: 3 / 4, alt: 'Complete the Look — product tags' },
    { src: 'assets/meta-shop-3.png?v=5', type: 'image', aspect: 3 / 4, alt: 'Complete the Look — outdoorvoices shop' },
    { src: 'assets/square-1.png', type: 'image', aspect: 3 / 4, alt: 'Square Online — cart' },
    { src: 'assets/square-oofe-cart-walkthrough.mov', type: 'video', poster: 'assets/square-1.png', aspect: 3 / 4, alt: 'Square Online — OOFE cart walkthrough' },
    { src: 'assets/square-2.png', type: 'image', aspect: 3 / 4, alt: 'Square Online — checkout login' },
    { src: 'assets/square-checkout-login-walkthrough.mov', type: 'video', poster: 'assets/square-2.png', aspect: 3 / 4, alt: 'Square Online — checkout login walkthrough' },
    { src: 'assets/square-3.png', type: 'image', aspect: 3 / 4, alt: 'Square Online — order tracking' },
    { src: 'assets/square-oofe-checkout-retail-walkthrough.mov', type: 'video', poster: 'assets/square-1.png', aspect: 3 / 4, alt: 'Square Online — OOFE checkout retail walkthrough' },
    { src: 'assets/cash-1.png', type: 'image', aspect: 3 / 4, alt: 'Cash App — cart' },
    { src: 'assets/cash-profiles-cart-walkthrough.mov', type: 'video', poster: 'assets/cash-1.png', aspect: 3 / 4, alt: 'Cash App — profiles cart walkthrough' },
    { src: 'assets/cash-2.png', type: 'image', aspect: 3 / 4, alt: 'Cash App — review and pay' },
    { src: 'assets/cash-profiles-checkout-walkthrough.mov', type: 'video', poster: 'assets/cash-2.png', aspect: 3 / 4, alt: 'Cash App — profiles checkout walkthrough' },
    { src: 'assets/cash-3.png', type: 'image', aspect: 3 / 4, alt: 'Cash App — order placed' },
    { src: 'assets/ogilvy-ibm-wimbledon.mp4', type: 'video', aspect: 16 / 9, alt: 'Ogilvy — IBM Wimbledon' },
    { src: 'assets/f1-alexa-testing-1.mp4', type: 'video', poster: 'assets/f1-alexa-voiceflow.png', aspect: 16 / 9, alt: 'F1 Alexa — user testing session one' },
    { src: 'assets/f1-alexa-testing-2.mp4', type: 'video', poster: 'assets/f1-alexa-voiceflow.png', aspect: 16 / 9, alt: 'F1 Alexa — user testing session two' },
    { src: 'assets/f1-alexa-voiceflow.png', type: 'image', aspect: 4 / 3, alt: 'F1 Alexa — voice experience flow' },
    { src: 'assets/scoutboard.mp4', type: 'video', aspect: 16 / 9, alt: 'Scoutboard prototype' },
    { src: 'assets/corporate-translate.mp4', type: 'video', aspect: 16 / 9, alt: 'Corporate Translate prototype' },
    { src: 'assets/collective-memory.mp4', type: 'video', aspect: 16 / 9, alt: 'WhatsApp Collective Memory prototype' },
    { src: 'assets/future-proof-newsletter.png', type: 'image', aspect: 3 / 4, alt: 'Future Proof newsletter' },
    { src: 'assets/devmeetdesign-landing.png', type: 'image', aspect: 16 / 10, alt: 'Dev Meet Design — landing page' },
    { src: 'assets/devmeetdesign-iphone.png', type: 'image', aspect: 3 / 4, alt: 'Dev Meet Design — mobile' }
  ];

  var stage = document.getElementById('playStage');
  var canvas = document.getElementById('playCanvas');
  var hint = document.getElementById('playHint');
  var lightbox = document.getElementById('playLightbox');
  var lightboxMedia = document.getElementById('playLightboxMedia');
  var lightboxBackdrop = document.getElementById('playLightboxBackdrop');
  var playPrev = document.getElementById('playPrev');
  var playNext = document.getElementById('playNext');
  var playCount = document.getElementById('playCount');
  var stagePrev = document.getElementById('playStagePrev');
  var stageNext = document.getElementById('playStageNext');
  var stageCount = document.getElementById('playStageCount');
  var themeToggle = document.getElementById('themeToggle');

  if (!stage || !canvas) return;

  var reducedMotion = false;
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  var sandboxHeader = document.querySelector('.site-header--sandbox');

  function updateHeaderTone() {
    if (!sandboxHeader) return;
    sandboxHeader.classList.toggle(
      'site-header--on-dark',
      document.documentElement.getAttribute('data-theme') === 'dark'
    );
  }

  if (themeToggle) {
    var root = document.documentElement;
    themeToggle.addEventListener('click', function () {
      var current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      var next = current === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (err) {}
      updateHeaderTone();
    });
  }

  updateHeaderTone();

  var COLS = window.innerWidth <= 640 ? 3 : (window.innerWidth <= 1024 ? 4 : 5);
  var GAP = 32;
  var ITEM_W = window.innerWidth <= 640 ? 240 : 300;

  function layoutItems(items) {
    var colHeights = [];
    var i;
    for (i = 0; i < COLS; i++) colHeights[i] = 0;

    return items.map(function (item, index) {
      var height = ITEM_W / item.aspect;
      var col = 0;
      for (i = 1; i < COLS; i++) {
        if (colHeights[i] < colHeights[col]) col = i;
      }
      var left = col * (ITEM_W + GAP);
      var top = colHeights[col];
      colHeights[col] += height + GAP;
      return {
        item: item,
        index: index,
        left: left,
        top: top,
        width: ITEM_W,
        height: height
      };
    });
  }

  function canvasSize(layout) {
    var maxRight = 0;
    var maxBottom = 0;
    layout.forEach(function (entry) {
      maxRight = Math.max(maxRight, entry.left + entry.width);
      maxBottom = Math.max(maxBottom, entry.top + entry.height);
    });
    return { width: maxRight, height: maxBottom };
  }

  function padIndex(n) {
    return '[' + String(n + 1).padStart(3, '0') + ']';
  }

  function appendMedia(figure, item) {
    if (item.type === 'video' && item.poster) {
      var poster = document.createElement('img');
      poster.src = item.poster;
      poster.alt = '';
      poster.loading = 'eager';
      poster.decoding = 'async';
      poster.draggable = false;
      figure.appendChild(poster);
    } else if (item.type === 'video') {
      var thumb = document.createElement('video');
      thumb.src = item.src;
      thumb.muted = true;
      thumb.playsInline = true;
      thumb.preload = 'metadata';
      thumb.setAttribute('aria-hidden', 'true');
      thumb.addEventListener('loadeddata', function () {
        try { thumb.currentTime = 0.1; } catch (err) {}
      }, { once: true });
      figure.appendChild(thumb);
    } else {
      var image = document.createElement('img');
      image.src = item.src;
      image.alt = item.alt || '';
      image.loading = 'eager';
      image.decoding = 'async';
      image.draggable = false;
      figure.appendChild(image);
    }

    if (item.type === 'video') {
      var badge = document.createElement('span');
      badge.className = 'play-item__badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = '▶';
      figure.appendChild(badge);
    }
  }

  function createItemNode(entry, tileX, tileY, tileW, tileH) {
    var item = entry.item;
    var figure = document.createElement('figure');
    figure.className = 'play-item';
    figure.style.left = (entry.left + tileX * tileW) + 'px';
    figure.style.top = (entry.top + tileY * tileH) + 'px';
    figure.style.width = entry.width + 'px';
    figure.style.height = entry.height + 'px';
    figure.dataset.index = String(entry.index);
    figure.dataset.tileX = String(tileX);
    figure.dataset.tileY = String(tileY);

    var label = document.createElement('span');
    label.className = 'play-label';
    label.textContent = padIndex(entry.index);
    figure.appendChild(label);

    appendMedia(figure, item);
    return figure;
  }

  var baseLayout = layoutItems(PLAYGROUND_ITEMS);
  var baseSize = canvasSize(baseLayout);
  var tileW = baseSize.width;
  var tileH = baseSize.height;

  stage.dataset.tileW = String(tileW);
  stage.dataset.tileH = String(tileH);
  canvas.style.width = (tileW * 3) + 'px';
  canvas.style.height = (tileH * 3) + 'px';

  var centerItems = [];
  var spreadTargets = [];

  for (var ty = -1; ty <= 1; ty++) {
    for (var tx = -1; tx <= 1; tx++) {
      baseLayout.forEach(function (entry) {
        var node = createItemNode(entry, tx, ty, tileW, tileH);
        canvas.appendChild(node);
        if (tx === 0 && ty === 0) {
          centerItems.push(node);
          spreadTargets.push({
            el: node,
            dx: tileW / 2 - entry.left - entry.width / 2,
            dy: tileH / 2 - entry.top - entry.height / 2
          });
        }
      });
    }
  }

  var MIN_SCALE = 0.25;
  var MAX_SCALE = 2.2;
  var view = { x: 0, y: 0, s: 1, tx: 0, ty: 0, ts: 1 };
  var pinchBoost = 1;
  var pinchTarget = 1;
  var ready = false;
  var entranceDone = false;
  var lightboxOpen = false;
  var lightboxIndex = 0;
  var momentum = { x: 0, y: 0 };

  function fitScale() {
    var rect = stage.getBoundingClientRect();
    var fit = Math.min(rect.width / tileW, rect.height / tileH) * 1.4;
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, fit));
  }

  function applyTransform() {
    var rect = stage.getBoundingClientRect();
    var cx = rect.width / 2;
    var cy = rect.height / 2;
    var px = cx - (cx - view.x) * pinchBoost;
    var py = cy - (cy - view.y) * pinchBoost;
    canvas.style.transform = 'translate(' + px + 'px, ' + py + 'px) scale(' + (view.s * pinchBoost) + ')';
  }

  function clampView() {
    var rect = stage.getBoundingClientRect();
    var scaledW = tileW * view.s;
    var scaledH = tileH * view.s;
    var cx = (rect.width / 2 - view.x) / view.s;
    var cy = (rect.height / 2 - view.y) / view.s;

    if (cx > tileW) {
      view.x += scaledW;
      view.tx += scaledW;
    } else if (cx < 0) {
      view.x -= scaledW;
      view.tx -= scaledW;
    }
    if (cy > tileH) {
      view.y += scaledH;
      view.ty += scaledH;
    } else if (cy < 0) {
      view.y -= scaledH;
      view.ty -= scaledH;
    }
  }

  function setScale(scale) {
    var rect = stage.getBoundingClientRect();
    view.ts = scale;
    view.tx = rect.width / 2 - (tileW * scale) / 2;
    view.ty = rect.height / 2 - (tileH * scale) / 2;
    view.x = view.tx;
    view.y = view.ty;
    view.s = scale;
    applyTransform();
  }

  function zoomAt(clientX, clientY, nextScale) {
    var rect = stage.getBoundingClientRect();
    var px = clientX - rect.left;
    var py = clientY - rect.top;
    var ratio = nextScale / view.ts;
    view.tx = px - (px - view.tx) * ratio;
    view.ty = py - (py - view.ty) * ratio;
    view.ts = nextScale;
  }

  function updateSpread(progress) {
    var t = 1 - progress;
    spreadTargets.forEach(function (target) {
      target.el.style.transform = 'translate(' + (target.dx * t) + 'px, ' + (target.dy * t) + 'px)';
    });
    var targetScale = MIN_SCALE + (fitScale() - MIN_SCALE) * progress;
    setScale(MIN_SCALE + (targetScale - MIN_SCALE) * progress);
  }

  function finishEntrance() {
    if (entranceDone) return;
    entranceDone = true;
    spreadTargets.forEach(function (target) {
      target.el.style.transform = '';
    });
    ready = true;
    setScale(fitScale());
    canvas.classList.add('is-ready');
    if (hint) {
      setTimeout(function () { hint.classList.add('is-hidden'); }, 3200);
    }
  }

  function runEntrance() {
    if (entranceDone) return;

    var safety = setTimeout(function () {
      if (!entranceDone) finishEntrance();
    }, 2800);

    if (reducedMotion) {
      setScale(fitScale());
      clearTimeout(safety);
      finishEntrance();
      return;
    }

    var start = performance.now();
    var duration = 1800;
    var fromScale = fitScale() * 0.55;

    function frame(now) {
      var t = Math.min(1, (now - start) / duration);
      var eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      updateSpread(eased);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        clearTimeout(safety);
        finishEntrance();
      }
    }

    setScale(fromScale);
    requestAnimationFrame(frame);
  }

  function waitForImages() {
    var imgs = Array.from(canvas.querySelectorAll('img'));
    var promises = imgs.map(function (img) {
      if (img.complete) return Promise.resolve();
      return new Promise(function (resolve) {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    });
    return Promise.race([
      Promise.all(promises),
      new Promise(function (resolve) { setTimeout(resolve, 1200); })
    ]);
  }

  function tick() {
    if (!lightboxOpen) {
      if (!dragging && (Math.abs(momentum.x) > 0.05 || Math.abs(momentum.y) > 0.05)) {
        view.tx += momentum.x;
        view.ty += momentum.y;
        momentum.x *= 0.92;
        momentum.y *= 0.92;
      }
      view.x += (view.tx - view.x) * 0.2;
      view.y += (view.ty - view.y) * 0.2;
      view.s += (view.ts - view.s) * 0.18;
      pinchBoost += (pinchTarget - pinchBoost) * 0.12;
      clampView();
      applyTransform();
    }
    requestAnimationFrame(tick);
  }

  function updateCounts() {
    var label = padIndex(lightboxIndex);
    if (playCount) playCount.textContent = label;
    if (stageCount) stageCount.textContent = label;
  }

  function renderLightboxMedia(index) {
    lightboxMedia.innerHTML = '';
    var item = PLAYGROUND_ITEMS[index];
    if (!item) return;

    if (item.type === 'video') {
      var video = document.createElement('video');
      video.src = item.src;
      video.controls = true;
      video.playsInline = true;
      video.autoplay = true;
      if (item.poster) video.poster = item.poster;
      video.setAttribute('aria-label', item.alt || '');
      lightboxMedia.appendChild(video);
    } else {
      var img = document.createElement('img');
      img.src = item.src;
      img.alt = item.alt || '';
      lightboxMedia.appendChild(img);
    }
  }

  function openLightbox(index) {
    lightboxIndex = index;
    updateCounts();
    renderLightboxMedia(lightboxIndex);
    lightbox.hidden = false;
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    stage.classList.add('is-lightbox-open');
    lightboxOpen = true;
  }

  function closeLightbox() {
    var video = lightboxMedia.querySelector('video');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    stage.classList.remove('is-lightbox-open');
    lightboxOpen = false;
    setTimeout(function () {
      if (!lightboxOpen) lightbox.hidden = true;
    }, 360);
  }

  function stepLightbox(delta) {
    lightboxIndex = (lightboxIndex + delta + PLAYGROUND_ITEMS.length) % PLAYGROUND_ITEMS.length;
    updateCounts();
    if (lightboxOpen) {
      renderLightboxMedia(lightboxIndex);
    }
  }

  function bindNav(btn, delta) {
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      stepLightbox(delta);
    });
  }

  bindNav(playPrev, -1);
  bindNav(playNext, 1);
  bindNav(stagePrev, -1);
  bindNav(stageNext, 1);

  if (stageCount) {
    stageCount.addEventListener('click', function () {
      if (!lightboxOpen) openLightbox(lightboxIndex);
    });
  }

  lightboxBackdrop.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
    if (lightboxOpen && e.key === 'Escape') closeLightbox();
  });

  var dragging = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var dragOriginX = 0;
  var dragOriginY = 0;
  var dragDistance = 0;
  var pressedItem = null;
  var pointers = new Map();
  var pinchStartDist = 0;
  var pinchStartScale = 1;
  var pinchCenter = { x: 0, y: 0 };

  function onPointerDown(e) {
    if (!ready || lightboxOpen) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1) {
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragOriginX = e.clientX;
      dragOriginY = e.clientY;
      dragDistance = 0;
      pressedItem = e.target.closest('.play-item');
      momentum.x = 0;
      momentum.y = 0;
      pinchTarget = 1.06;
      stage.classList.add('is-dragging');
      stage.setPointerCapture(e.pointerId);
    } else if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartScale = view.ts;
      pinchCenter = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2
      };
      dragging = false;
    }
  }

  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1 && dragging) {
      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragDistance = Math.max(dragDistance, Math.hypot(e.clientX - dragOriginX, e.clientY - dragOriginY));
      view.tx += dx;
      view.ty += dy;
      view.x += dx;
      view.y += dy;
      momentum.x = dx;
      momentum.y = dy;
      applyTransform();
    } else if (pointers.size === 2) {
      var points = Array.from(pointers.values());
      var dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (pinchStartDist > 0) {
        var next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchStartScale * (dist / pinchStartDist)));
        zoomAt(pinchCenter.x, pinchCenter.y, next);
      }
    }
  }

  function onPointerUp(e) {
    var wasTap = dragging && pointers.size === 1 && dragDistance < 8;
    pointers.delete(e.pointerId);

    if (pointers.size === 0) {
      dragging = false;
      pinchTarget = 1;
      stage.classList.remove('is-dragging');
      if (wasTap && !lightboxOpen && pressedItem) {
        if (pressedItem.dataset.tileX === '0' && pressedItem.dataset.tileY === '0' && pressedItem.dataset.index) {
          openLightbox(parseInt(pressedItem.dataset.index, 10));
        }
      }
      pressedItem = null;
    }
  }

  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', onPointerUp);
  stage.addEventListener('pointerleave', onPointerUp);

  stage.addEventListener('wheel', function (e) {
    if (!ready || lightboxOpen) return;
    e.preventDefault();
    var delta = -e.deltaY * 0.0015;
    var next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, view.ts * (1 + delta)));
    zoomAt(e.clientX, e.clientY, next);
  }, { passive: false });

  window.addEventListener('resize', function () {
    if (ready && !lightboxOpen) setScale(fitScale());
  });

  updateCounts();
  waitForImages().then(runEntrance);
  requestAnimationFrame(tick);
})();
