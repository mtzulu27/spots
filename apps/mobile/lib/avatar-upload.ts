export async function prepareAvatar(uri: string, mime: string) {
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('La foto debe pesar menos de 5 MB.');
  return { bytes, mime };
}
