export const IBIZA_DISCOVERY_QUERY = 'Ibiza 122';

export function getIbizaAnnouncementLayout(measuredWidth: number) {
  const width = Number.isFinite(measuredWidth) && measuredWidth > 0 ? measuredWidth : 350;
  const narrow = width < 320;
  const wide = width >= 610;
  const messageLeft = width * (narrow || wide ? 0.5 : 0.52);
  const imageLeft = narrow ? -20 : wide ? width * 0.09 : -6;
  const imageWidth = Math.min(narrow ? 140 : wide ? 230 : 176, messageLeft - imageLeft - 16);
  return {
    imageWidth,
    imageHeight: narrow ? 166 : wide ? 200 : 176,
    imageLeft,
    imageTop: narrow ? -1 : wide ? -20 : -6,
    brandWidth: wide ? 280 : 230,
    brandHeight: (wide ? 280 : 230) * 300 / 230,
    brandLeft: wide ? width * 0.12 : -22,
    messageLeft,
    messageRight: narrow ? 10 : 14,
    messageTop: wide ? 20 : 24,
    leadSize: narrow ? 17 : wide ? 22 : 19,
    leadLineHeight: narrow ? 22 : wide ? 26 : 23,
    textInset: narrow ? 6 : 8,
    destinationSize: narrow ? 23 : wide ? 32 : 26,
    destinationLineHeight: narrow ? 26 : wide ? 34 : 28,
    destinationPaddingX: narrow ? 9 : 12,
    destinationPaddingTop: narrow ? 7 : 8,
    destinationPaddingBottom: narrow ? 9 : 10,
    supportSize: narrow ? 11 : 12,
    supportLineHeight: narrow ? 16 : 17,
    logoSize: narrow ? 28 : 30,
    logoLeft: narrow ? 12 : wide ? 18 : 14,
    arrowRight: narrow ? 12 : 16,
  };
}
