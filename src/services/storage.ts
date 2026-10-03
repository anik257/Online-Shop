import { supabase } from '../lib/supabase'

export const PRODUCT_IMAGES_BUCKET = 'product-images'

export interface UploadImageResult {
  url: string | null
  error: string | null
}

/**
 * Uploads a product image to the Supabase Storage 'product-images' bucket.
 * Returns the public CDN URL to be saved in PostgreSQL products.image_url.
 */
export async function uploadProductImage(file: File): Promise<UploadImageResult> {
  try {
    // 1. Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
    if (!validTypes.includes(file.type)) {
      return {
        url: null,
        error: 'Invalid file format. Please upload JPG, PNG, WEBP, or GIF.',
      }
    }

    // 2. Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        url: null,
        error: 'File size exceeds 5MB limit. Please upload a smaller image.',
      }
    }

    // 3. Generate sanitized unique path
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const cleanFileName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30)
    const filePath = `products/${Date.now()}-${cleanFileName}.${fileExt}`

    // 4. Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('[Storage] Upload error:', error)
      return { url: null, error: error.message || 'Failed to upload image to Supabase Storage.' }
    }

    // 5. Retrieve public URL
    const { data: urlData } = supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(data.path)

    return { url: urlData.publicUrl, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected upload error occurred.'
    console.error('[Storage] Unexpected upload exception:', err)
    return { url: null, error: message }
  }
}

/**
 * Deletes an image from the Supabase Storage bucket by its public URL
 */
export async function deleteProductImageByUrl(imageUrl: string): Promise<boolean> {
  try {
    if (!imageUrl || !imageUrl.includes(PRODUCT_IMAGES_BUCKET)) {
      return true
    }

    // Extract path after bucket name
    const urlParts = imageUrl.split(`/${PRODUCT_IMAGES_BUCKET}/`)
    if (urlParts.length < 2) return true

    const storagePath = decodeURIComponent(urlParts[1].split('?')[0])

    const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([storagePath])
    if (error) {
      console.warn('[Storage] Image deletion warning:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.warn('[Storage] Error during image deletion:', err)
    return false
  }
}
