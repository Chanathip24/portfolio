import { browserClient } from "@/lib/supabase/browser";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Uploads an image to the public `media` bucket and returns its URL. The bucket's policy only lets an
 *  MFA-verified admin write, and it enforces the same type and size limits, so these checks are just for a clear message. */
export async function uploadImage(file: File): Promise<string> {
  const ext = TYPES[file.type];
  if (!ext) throw new Error("Use a PNG, JPG, WebP, GIF or AVIF image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images can be up to 5 MB.");
  const sb = browserClient();
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from("media").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error("Upload failed. Check your connection and try again.");
  return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
}
