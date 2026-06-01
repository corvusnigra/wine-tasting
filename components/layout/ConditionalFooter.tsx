"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

// The wine-rating step flow (/sessions/<id>/wine/<id>) has its own fixed
// bottom action bar, so the global disclaimer footer must not render there —
// otherwise the two overlap at the bottom of the viewport.
export function ConditionalFooter() {
  const pathname = usePathname();
  const isRatingFlow = /^\/sessions\/[^/]+\/wine\/[^/]+/.test(pathname ?? "");
  if (isRatingFlow) return null;
  return <Footer />;
}
