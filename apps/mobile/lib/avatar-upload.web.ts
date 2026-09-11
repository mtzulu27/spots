export async function prepareAvatar(uri: string, _mime: string) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('No pudimos leer la foto.');
  const blob = await response.blob();
  if (blob.size > 5 * 1024 * 1024) throw new Error('La foto debe pesar menos de 5 MB.');
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No pudimos procesar la foto.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const resized = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('No pudimos comprimir la foto.')), 'image/jpeg', .8));
    if (resized.size > 200 * 1024) throw new Error('Prueba una foto más sencilla: el avatar debe pesar menos de 200 KB.');
    return { bytes: await resized.arrayBuffer(), mime: 'image/jpeg' };
  } finally { URL.revokeObjectURL(url); }
}
