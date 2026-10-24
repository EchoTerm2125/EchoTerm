/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Horizontal Strip Scrolling
   Wheel-to-horizontal panning plus an overlay slider for the Group bar and the
   Tab bar. Chrome reserves layout height for a native scrollbar, so both
   strips hide theirs and paint this slider over the bottom edge of the
   content instead (see ADR 0015).
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /** Shortest thumb, so a very long strip stays grabbable. */
  const THUMB_MIN_WIDTH = 20;
  /** Wheel line height for deltaMode 1 (lines). */
  const WHEEL_LINE_HEIGHT = 16;

  interface StripMetrics {
    overflowing: boolean;
    thumbWidth: number;
    thumbLeft: number;
  }

  /** Thumb geometry for a strip that is scrolled to `scrollLeft`. */
  function thumbMetrics(viewWidth: number, scrollWidth: number, scrollLeft: number): StripMetrics {
    if (viewWidth <= 0 || scrollWidth <= viewWidth) {
      return { overflowing: false, thumbWidth: 0, thumbLeft: 0 };
    }
    const thumbWidth = Math.max(
      Math.min(THUMB_MIN_WIDTH, viewWidth),
      (viewWidth * viewWidth) / scrollWidth,
    );
    const track = viewWidth - thumbWidth;
    const maxScroll = scrollWidth - viewWidth;
    const ratio = maxScroll > 0 ? Math.min(1, Math.max(0, scrollLeft / maxScroll)) : 0;
    return {
      overflowing: true,
      thumbWidth: Math.round(thumbWidth),
      thumbLeft: Math.round(track * ratio),
    };
  }

  interface WheelLike {
    deltaX?: number;
    deltaY: number;
    deltaMode?: number;
    shiftKey?: boolean;
  }

  /**
   * Horizontal displacement for a wheel event, or null when the event must be
   * left to the browser (trackpad `deltaX`, Shift+wheel, no vertical delta).
   */
  function wheelStep(e: WheelLike, viewWidth: number): number | null {
    if (e.shiftKey || e.deltaX) return null;
    if (!e.deltaY) return null;
    if (e.deltaMode === 1) return e.deltaY * WHEEL_LINE_HEIGHT;
    if (e.deltaMode === 2) return e.deltaY * viewWidth;
    return e.deltaY;
  }

  const strips: Array<{ list: HTMLElement; update: () => void }> = [];

  function attach(list: HTMLElement, hoverHost: HTMLElement): void {
    if (!list || !hoverHost) return;

    let slider = hoverHost.querySelector(':scope > .strip-slider') as HTMLElement | null;
    if (!slider) {
      slider = document.createElement('div');
      slider.className = 'strip-slider';
      const thumb = document.createElement('div');
      thumb.className = 'strip-thumb';
      slider.appendChild(thumb);
      hoverHost.appendChild(slider);
    }
    const thumb = slider.querySelector('.strip-thumb') as HTMLElement;
    const sliderEl = slider;

    let dragging = false;
    let inside = false;
    let dragStartX = 0;
    let dragStartScroll = 0;

    function update(): void {
      sliderEl.style.left = `${list.offsetLeft}px`;
      sliderEl.style.width = `${list.clientWidth}px`;
      const m = thumbMetrics(list.clientWidth, list.scrollWidth, list.scrollLeft);
      sliderEl.classList.toggle('overflowing', m.overflowing);
      if (m.overflowing) {
        thumb.style.width = `${m.thumbWidth}px`;
        thumb.style.left = `${m.thumbLeft}px`;
      }
      // Re-evaluate the reveal as well: a layout change elsewhere can start or
      // stop overflow while the pointer sits still.
      if (!dragging) sliderEl.classList.toggle('visible', inside && m.overflowing);
    }

    function isPointInsideList(clientX: number, clientY: number): boolean {
      const r = list.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    }

    // ── Wheel → horizontal panning ──
    list.addEventListener('wheel', (e: WheelEvent) => {
      const step = wheelStep(e, list.clientWidth);
      if (step === null) return;
      if (list.scrollWidth <= list.clientWidth) return;
      // Consumed even at either end: the gesture's response stays uniform.
      e.preventDefault();
      list.scrollLeft += step;
    }, { passive: false });

    list.addEventListener('scroll', update, { passive: true });

    // ── Hover reveal, measured against the list (the host also holds buttons) ──
    hoverHost.addEventListener('pointermove', (e: PointerEvent) => {
      if (dragging) return;
      const next = isPointInsideList(e.clientX, e.clientY);
      if (next === inside) return;
      inside = next;
      sliderEl.classList.toggle('visible', inside && sliderEl.classList.contains('overflowing'));
    });

    hoverHost.addEventListener('pointerleave', () => {
      inside = false;
      if (!dragging) sliderEl.classList.remove('visible');
    });

    // ── Thumb drag ──
    thumb.addEventListener('pointerdown', (e: PointerEvent) => {
      const m = thumbMetrics(list.clientWidth, list.scrollWidth, list.scrollLeft);
      if (!m.overflowing || m.thumbWidth >= list.clientWidth) return;
      e.preventDefault();
      dragging = true;
      dragStartX = e.clientX;
      dragStartScroll = list.scrollLeft;
      sliderEl.classList.add('visible');
      thumb.setPointerCapture(e.pointerId);
    });

    thumb.addEventListener('pointermove', (e: PointerEvent) => {
      if (!dragging) return;
      const m = thumbMetrics(list.clientWidth, list.scrollWidth, list.scrollLeft);
      const track = list.clientWidth - m.thumbWidth;
      if (track <= 0) return;
      const maxScroll = list.scrollWidth - list.clientWidth;
      list.scrollLeft = dragStartScroll + ((e.clientX - dragStartX) / track) * maxScroll;
    });

    function endDrag(e: PointerEvent): void {
      if (!dragging) return;
      dragging = false;
      if (thumb.hasPointerCapture(e.pointerId)) thumb.releasePointerCapture(e.pointerId);
      inside = isPointInsideList(e.clientX, e.clientY);
      sliderEl.classList.toggle('visible', inside && sliderEl.classList.contains('overflowing'));
    }
    thumb.addEventListener('pointerup', endDrag);
    thumb.addEventListener('pointercancel', endDrag);

    // ── Re-measure on resize, zoom-scale changes, and entries added/removed ──
    // `style`/`class` too: entries are shown and hidden en masse when the Active
    // group changes, which never adds or removes a child.
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(update).observe(list);
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(update).observe(list, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    strips.push({ list, update });
    update();
  }

  function refresh(): void {
    for (const s of strips) s.update();
  }

  window.addEventListener('resize', refresh);

  // Both strips cover the full height of their bar, so the bar is the hover host.
  const groupList = App.groupList;
  const tabList = App.tabList;
  if (groupList) attach(groupList, groupList.parentElement);
  if (tabList) attach(tabList, tabList.parentElement);

  App.ScrollStrip = { attach, refresh, thumbMetrics, wheelStep };
})();

export {};
