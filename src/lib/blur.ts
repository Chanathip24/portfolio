import blurs from "@/content/blur.json";

/** Spread onto next/image: `<Image src={p} {...blur(p)} />` shows the tiny blurred preview while it loads. */
export const blur = (src: string) => {
  const blurDataURL = (blurs as Record<string, string>)[src];
  return blurDataURL ? ({ placeholder: "blur", blurDataURL } as const) : {};
};
