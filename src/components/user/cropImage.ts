
import type { Area } from 'react-easy-crop';

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(new Error(`Failed to load image. This may be due to a CORS issue or an invalid URL. Original error: ${error}`)));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth?: number
): Promise<string | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;

  if (outputWidth && pixelCrop.width > outputWidth) {
    const aspectRatio = pixelCrop.height / pixelCrop.width;
    targetWidth = outputWidth;
    targetHeight = Math.round(outputWidth * aspectRatio);
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }
  
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  // Return as JPEG with quality 0.8 for smaller size
  return canvas.toDataURL('image/jpeg', 0.8);
}

export { getCroppedImg };
