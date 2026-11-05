// Unit tests for scroll-strip.ts — wheel mapping, thumb geometry, strip wiring
import { setupTest, getApp } from '../setup.js';

describe('ScrollStrip (scroll-strip.ts)', () => {
  beforeEach(async () => {
    await setupTest('scroll-strip');
  });

  describe('wheelStep', () => {
    const step = (e: WheelEventInit, width = 400) => getApp().ScrollStrip.wheelStep(e, width);

    it('maps a pixel deltaY straight through', () => {
      expect(step({ deltaY: 40 })).toBe(40);
    });

    it('treats deltaMode 1 as lines and deltaMode 2 as pages', () => {
      expect(step({ deltaY: -2, deltaMode: 1 })).toBe(-32);
      expect(step({ deltaY: 1, deltaMode: 2 }, 300)).toBe(300);
    });

    it('leaves horizontal gestures to the browser', () => {
      expect(step({ deltaY: 40, deltaX: 20 })).toBeNull();
      expect(step({ deltaY: 40, shiftKey: true })).toBeNull();
    });

    it('ignores events with no vertical delta', () => {
      expect(step({ deltaY: 0 })).toBeNull();
    });
  });

  describe('thumbMetrics', () => {
    const metrics = (...args: number[]) => getApp().ScrollStrip.thumbMetrics(...args);

    it('reports no overflow when the content fits', () => {
      expect(metrics(100, 100, 0)).toEqual({ overflowing: false, thumbWidth: 0, thumbLeft: 0 });
      expect(metrics(0, 300, 0)).toEqual({ overflowing: false, thumbWidth: 0, thumbLeft: 0 });
    });

    it('sizes the thumb in proportion to the visible width', () => {
      expect(metrics(100, 300, 0)).toEqual({ overflowing: true, thumbWidth: 33, thumbLeft: 0 });
    });

    it('clamps the thumb to a grabbable minimum', () => {
      expect(metrics(100, 100000, 0).thumbWidth).toBe(20);
    });

    it('places the thumb by scroll ratio, ending flush at the far end', () => {
      expect(metrics(100, 300, 100).thumbLeft).toBe(33);
      expect(metrics(100, 300, 200).thumbLeft).toBe(67);
      expect(metrics(100, 300, 500).thumbLeft).toBe(67);
    });
  });

  describe('wiring', () => {
    it('paints one slider over each strip', () => {
      expect(document.querySelectorAll('.strip-slider').length).toBe(2);
      expect(document.querySelectorAll('.strip-thumb').length).toBe(2);
    });

    it('reuses an existing slider when attached twice', () => {
      const App = getApp();
      App.ScrollStrip.attach(App.groupList, App.groupList.parentElement);
      expect(document.querySelectorAll('.strip-slider').length).toBe(2);
    });
  });
});
