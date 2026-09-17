import jsQR from 'jsqr';
import {describe, expect, it} from 'vitest';
import {
  createQrSvg,
  createQrSymbol,
  layoutQr,
  parseErrorCorrectionLevel,
  QR_SVG_SIZE,
  QUIET_ZONE_MODULES
} from '../src/qr-svg.js';

/** Paints the SVG's module path back into pixels, the way a camera would see it. */
function rasterize(svg: string, scale = 2): {data: Uint8ClampedArray; width: number} {
  const side = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)?.[1]);
  const width = side * scale;
  const data = new Uint8ClampedArray(width * width * 4).fill(255);
  const path = /<path d="([^"]*)"/.exec(svg)?.[1] ?? '';
  for (const match of path.matchAll(/M(\d+) (\d+)h(\d+)v\d+h-\d+z/g)) {
    const left = Number(match[1]) * scale;
    const top = Number(match[2]) * scale;
    const size = Number(match[3]) * scale;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const pixel = (top + y) * width + left + x;
        data[pixel * 4] = 0;
        data[pixel * 4 + 1] = 0;
        data[pixel * 4 + 2] = 0;
      }
    }
  }
  return {data, width};
}

describe('createQrSvg', () => {
  it('reads back the same text, including non-ASCII text', () => {
    for (const text of ['Hello, world!', 'カメラの校正プロファイル', '{"fx":612.3,"fy":611.8}']) {
      const image = rasterize(createQrSvg(text, 'M'));
      expect(jsQR(image.data, image.width, image.width)?.data).toBe(text);
    }
  });

  it('reads back a calibration-profile-sized text at the highest level', () => {
    const text = JSON.stringify({profile: 'x'.repeat(440)});
    const image = rasterize(createQrSvg(text, 'H'));
    expect(jsQR(image.data, image.width, image.width)?.data).toBe(text);
  });

  it('draws every module a whole number of stage units, within the limit', () => {
    // A module a fraction of a unit wide is rounded differently each time
    // TurboWarp rasterizes it, and the grid comes out uneven.
    for (const [text, maxSize] of [
      ['size', undefined],
      ['size', 100],
      [JSON.stringify({profile: 'x'.repeat(640)}), 253],
      [JSON.stringify({profile: 'x'.repeat(640)}), 90]
    ] as const) {
      const symbol = createQrSymbol(text, 'L');
      const layout = layoutQr(symbol, maxSize === undefined ? {} : {maxSize});
      expect(Number.isInteger(layout.moduleSize)).toBe(true);
      expect(layout.moduleSize).toBeGreaterThanOrEqual(1);
      expect(layout.modules).toBe(symbol.size + QUIET_ZONE_MODULES * 2);
      expect(layout.side).toBe(layout.modules * layout.moduleSize);
      const limit = maxSize ?? QR_SVG_SIZE;
      // Within the limit whenever one unit per module fits at all, and never
      // a whole module short of it.
      if (layout.modules <= limit) {
        expect(layout.side).toBeLessThanOrEqual(limit);
        expect(layout.side + layout.modules).toBeGreaterThan(limit);
      } else {
        expect(layout.moduleSize).toBe(1);
      }
      const svg = createQrSvg(text, 'L', maxSize === undefined ? {} : {maxSize});
      expect(svg).toContain(`viewBox="0 0 ${layout.side} ${layout.side}"`);
      expect(svg).toContain(`width="${layout.side}" height="${layout.side}"`);
      expect(svg).not.toContain('transform');
      expect(svg).not.toContain('100%');
      expect(svg).toContain(
        `M${QUIET_ZONE_MODULES * layout.moduleSize} ${QUIET_ZONE_MODULES * layout.moduleSize}h${layout.moduleSize}`
      );
      const image = rasterize(svg, 1);
      expect(jsQR(image.data, image.width, image.width)?.data).toBe(text);
    }
  });

  it('refuses a size that is not a positive number', () => {
    for (const maxSize of [0, -5, Number.NaN]) {
      expect(() => createQrSvg('x', 'M', {maxSize})).toThrow(
        expect.objectContaining({code: 'invalid-size'})
      );
    }
  });

  it('grows the symbol with the error correction level', () => {
    const text = 'a'.repeat(100);
    expect(createQrSymbol(text, 'H').version).toBeGreaterThan(createQrSymbol(text, 'L').version);
  });

  it('names the failure without repeating the text', () => {
    const secret = 'secret-'.repeat(1000);
    expect(() => createQrSvg(secret, 'H')).toThrow(
      expect.objectContaining({code: 'text-too-long', message: expect.not.stringContaining('secret')})
    );
    expect(() => createQrSvg('', 'M')).toThrow(expect.objectContaining({code: 'empty-text'}));
  });

  it('accepts the four levels in either case', () => {
    expect(parseErrorCorrectionLevel(' h ')).toBe('H');
    expect(parseErrorCorrectionLevel('q')).toBe('Q');
    expect(() => parseErrorCorrectionLevel('X')).toThrow(
      expect.objectContaining({code: 'invalid-level'})
    );
  });
});
