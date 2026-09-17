import {QrDisplayError} from './errors.js';

interface DisplayRecord {
  drawableId: number;
  originalSkinId: number;
  temporarySkinId: number;
}

interface RequiredRenderer extends TurboWarpRenderer {
  createSVGSkin(svg: string): number;
  destroySkin(skinId: number): void;
  updateDrawableSkinId(drawableId: number, skinId: number): void;
}

/**
 * Swaps a sprite's skin for an SVG and puts the sprite's own costume back.
 *
 * The sprite's costume is left untouched, so nothing of the display is saved
 * into the project. Every exit restores it: hiding, the stop sign, the green
 * flag, removing the sprite, loading another project, or disposing the
 * runtime. Restoring uses the costume the sprite is wearing at that moment, so
 * a costume switched while the QR was up is the one that comes back.
 */
export class SpriteSkinDisplay {
  private readonly displays = new Map<TurboWarpTarget, DisplayRecord>();

  public constructor(private readonly runtime: TurboWarpRuntime) {}

  public validateTarget(target: TurboWarpTarget | undefined): TurboWarpTarget {
    if (!target || target.isStage) {
      throw new QrDisplayError('invalid-target', 'A QR code can only be shown on a sprite.');
    }
    if (target.isOriginal === false) {
      throw new QrDisplayError('invalid-target', 'A QR code cannot be shown on a clone.');
    }
    if (!Number.isInteger(target.drawableID) || Number(target.drawableID) < 0) {
      throw new QrDisplayError('renderer-unavailable', 'The sprite has no drawable.');
    }
    return target;
  }

  public show(targetValue: TurboWarpTarget | undefined, svg: string): TurboWarpTarget {
    const target = this.validateTarget(targetValue);
    const renderer = requireRenderer(this.runtime.renderer);
    const drawableId = Number(target.drawableID);
    const current = this.displays.get(target);
    const originalSkinId = current?.originalSkinId ?? drawableSkinId(renderer, drawableId);
    if (originalSkinId === undefined) {
      throw new QrDisplayError('renderer-unavailable', 'The sprite has no skin to restore.');
    }
    const temporarySkinId = renderer.createSVGSkin(svg);
    if (!Number.isInteger(temporarySkinId) || temporarySkinId < 0) {
      throw new QrDisplayError('renderer-unavailable', 'The renderer could not create a QR skin.');
    }
    try {
      renderer.updateDrawableSkinId(drawableId, temporarySkinId);
    } catch (error) {
      renderer.destroySkin(temporarySkinId);
      throw new QrDisplayError('renderer-unavailable', 'The renderer could not show the QR skin.', {
        cause: error
      });
    }
    this.displays.set(target, {drawableId, originalSkinId, temporarySkinId});
    if (current) renderer.destroySkin(current.temporarySkinId);
    this.runtime.requestRedraw?.();
    return target;
  }

  public hide(target: TurboWarpTarget | undefined): void {
    if (!target) return;
    const record = this.displays.get(target);
    if (!record) return;
    this.displays.delete(target);
    const renderer = this.runtime.renderer;
    try {
      const stillOnStage = this.runtime.targets?.includes(target) !== false;
      if (stillOnStage && renderer?.updateDrawableSkinId) {
        const skinId = costumeSkinId(target) ?? record.originalSkinId;
        renderer.updateDrawableSkinId(record.drawableId, skinId);
      }
    } finally {
      renderer?.destroySkin?.(record.temporarySkinId);
      this.runtime.requestRedraw?.();
    }
  }

  public hideAll(): void {
    for (const target of [...this.displays.keys()]) this.hide(target);
  }

  /** False once the sprite has switched costume, which takes the QR off. */
  public isShowing(target: TurboWarpTarget | undefined): boolean {
    if (!target) return false;
    const record = this.displays.get(target);
    if (!record) return false;
    const renderer = this.runtime.renderer;
    if (!renderer) return false;
    const skinId = renderer._allDrawables?.[record.drawableId]?._skin?._id;
    return skinId === undefined || skinId === record.temporarySkinId;
  }
}

function requireRenderer(renderer: TurboWarpRenderer | undefined): RequiredRenderer {
  if (
    !renderer ||
    typeof renderer.createSVGSkin !== 'function' ||
    typeof renderer.destroySkin !== 'function' ||
    typeof renderer.updateDrawableSkinId !== 'function'
  ) {
    throw new QrDisplayError('renderer-unavailable', 'The TurboWarp renderer is not available.');
  }
  return renderer as RequiredRenderer;
}

function drawableSkinId(renderer: RequiredRenderer, drawableId: number): number | undefined {
  const skinId = renderer._allDrawables?.[drawableId]?._skin?._id;
  return Number.isInteger(skinId) && Number(skinId) >= 0 ? Number(skinId) : undefined;
}

function costumeSkinId(target: TurboWarpTarget): number | undefined {
  const costumes = target.getCostumes?.();
  const index = target.currentCostume;
  if (!costumes || typeof index !== 'number') return undefined;
  const skinId = costumes[index]?.skinId;
  return Number.isInteger(skinId) && Number(skinId) >= 0 ? Number(skinId) : undefined;
}
