import { Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Swaps a broken image for an inline placeholder. Also sets loading="lazy"
 * / decoding="async" so long product grids stay light.
 */
@Directive({
  selector: 'img[appImg]',
  host: {
    loading: 'lazy',
    decoding: 'async',
    '(error)': 'onError()',
  },
})
export class FallbackImgDirective {
  private readonly el = inject(ElementRef<HTMLImageElement>);
  readonly appImg = input<string>('');

  private static readonly PLACEHOLDER =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="#eee"/><text x="50%" y="50%" fill="#999" font-family="sans-serif" font-size="20" text-anchor="middle" dominant-baseline="middle">no image</text></svg>`,
    );

  onError(): void {
    const img = this.el.nativeElement;
    if (img.src !== FallbackImgDirective.PLACEHOLDER) {
      img.src = FallbackImgDirective.PLACEHOLDER;
    }
  }
}
