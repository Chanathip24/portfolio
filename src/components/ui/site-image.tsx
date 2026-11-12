import Image, { type ImageProps } from "next/image";
import { blur } from "@/lib/blur";

/** The only image component to use here: next/image plus the tiny blur preview from src/content/blur.json
 *  (npm run blur). Pass `sizes` for anything narrower than the full viewport. */
export function SiteImage({ src, sizes = "100vw", alt = "", ...props }: ImageProps & { src: string }) {
  return <Image src={src} sizes={sizes} alt={alt} {...blur(src)} {...props} />;
}
