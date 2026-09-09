/**
 * Client-side image processing.
 *
 * This is what makes a responsive, fast media library possible on free tiers.
 * Instead of paying an image CDN to transform on request, the browser does the
 * work once at upload time: decode, downscale to each target width, and
 * re-encode as WebP. We then store every size and emit a real `srcset`.
 *
 * It runs in the admin only, on a machine that is already idle while someone
 * picks a file — so the cost lands in exactly the right place.
 */

/** Widths we generate. Anything wider than the source is skipped. */
export const TARGET_WIDTHS: number[] = [480, 960, 1600, 2400]

export interface ProcessedVariant {
  width: number
  height: number
  blob: Blob
  extension: string
  mimeType: string
}

export interface ProcessedImage {
  original: { width: number; height: number; sizeBytes: number; mimeType: string }
  variants: ProcessedVariant[]
}

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
export const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
]

export class ImageProcessingError extends Error {}

/**
 * SVG is passed through untouched.
 *
 * Rasterising vector art would defeat the point of it, and it is already
 * small. It is served from Supabase Storage as a static file rather than
 * inlined into a page, so a script inside an uploaded SVG would execute only
 * on the Storage origin, never on ours.
 */
export function isVector(file: File): boolean {
  return file.type === 'image/svg+xml'
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      // Honours EXIF orientation, unlike a bare <img> in some browsers.
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Fall through to the <img> path.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () =>
        reject(new ImageProcessingError('That file could not be read as an image.'))
      img.src = url
    })
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

function dimensions(source: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  if ('naturalWidth' in source) {
    return { width: source.naturalWidth, height: source.naturalHeight }
  }
  return { width: source.width, height: source.height }
}

async function encode(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  const attempt = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

  const webp = await attempt('image/webp')
  if (webp && webp.type === 'image/webp') {
    return { blob: webp, mimeType: 'image/webp', extension: 'webp' }
  }

  const jpeg = await attempt('image/jpeg')
  if (jpeg) return { blob: jpeg, mimeType: 'image/jpeg', extension: 'jpg' }

  throw new ImageProcessingError('This browser could not re-encode the image.')
}

/**
 * Produces the responsive set.
 *
 * Quality steps down slightly for the largest sizes: at 2400px wide, 0.78 is
 * visually indistinguishable from 0.85 and meaningfully smaller on the wire.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageProcessingError(
      'Only JPEG, PNG, WebP, AVIF, GIF and SVG images can be uploaded.',
    )
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageProcessingError('That file is larger than 25 MB. Please export a smaller one.')
  }

  const source = await decode(file)
  const { width, height } = dimensions(source)

  if (!width || !height) {
    throw new ImageProcessingError('That image reported no dimensions and cannot be processed.')
  }

  // Every width below the source, plus the source itself capped at 2400.
  const widths = new Set(TARGET_WIDTHS.filter((w) => w < width))
  widths.add(Math.min(width, 2400))

  const variants: ProcessedVariant[] = []

  for (const targetWidth of [...widths].sort((a, b) => a - b)) {
    const scale = targetWidth / width
    const targetHeight = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const context = canvas.getContext('2d')
    if (!context) throw new ImageProcessingError('Could not create a drawing context.')

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    // Flatten onto ivory, not black: a transparent PNG re-encoded as
    // WebP/JPEG then sits on the site's own background colour.
    context.fillStyle = '#F6F0E3'
    context.fillRect(0, 0, targetWidth, targetHeight)
    context.drawImage(source as CanvasImageSource, 0, 0, targetWidth, targetHeight)

    const quality = targetWidth >= 1600 ? 0.78 : 0.85
    const { blob, mimeType, extension } = await encode(canvas, quality)

    variants.push({ width: targetWidth, height: targetHeight, blob, mimeType, extension })
  }

  if ('close' in source && typeof source.close === 'function') source.close()

  return {
    original: { width, height, sizeBytes: file.size, mimeType: file.type },
    variants,
  }
}

/** Storage key: `<folder>/<timestamp>-<slug>[-<width>].<ext>`. */
export function buildStoragePath(args: {
  folder: string
  fileName: string
  width?: number
  extension: string
}): string {
  const { folder, fileName, width, extension } = args
  const base =
    fileName
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'

  const stamp = Date.now().toString(36)
  const suffix = width ? `-${width}` : ''
  const safeFolder = folder.replace(/[^a-z0-9-]/g, '') || 'general'
  return `${safeFolder}/${stamp}-${base}${suffix}.${extension}`
}
