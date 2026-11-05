export function observeStickySearch(options: {
  viewport: HTMLElement;
  profile: HTMLElement;
  onChange: (active: boolean) => void;
  environment?: typeof globalThis;
}): () => void;
