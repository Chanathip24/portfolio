import Image, { type ImageProps } from "next/image";
import { blur } from "@/lib/blur";
import { cn } from "cn";

/** The only image component to use here: next/image plus the tiny blur preview from src/content/blur.json
 *  (npm run blur). Pass `sizes` for anything narrower than the full viewport. A post or project saved without a
 *  cover has an empty `src`; that renders a quiet placeholder of the same box instead of a broken image. */
export function SiteImage({ src, sizes = "100vw", alt = "", ...props }: Omit<ImageProps, "src"> & { src: string }) {
  if (!src) return <div aria-hidden className={cn("bg-muted", props.fill && "absolute inset-0", props.className)} style={props.fill ? undefined : { width: props.width, height: props.height }} />;
  return <Image src={src} sizes={sizes} alt={alt} {...blur(src)} {...props} />;
}
