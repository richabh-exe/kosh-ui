import { DEFAULT_STORAGE_KEY } from "./preference-store";
import type { MotionPreference } from "./types";

/**
 * Sets <html data-motion> before the first paint.
 *
 * React only learns the visitor's stored choice and OS setting after
 * hydration. Without this script, a visitor who chose "none" would see one
 * frame of motion-enabled CSS first. Render it in <head> from a Server
 * Component, and add suppressHydrationWarning to <html>.
 *
 * It mirrors useMotionLevel: the calmest of app, stored choice and OS wins.
 */
export function MotionScript({
  motion = "auto",
  storageKey = DEFAULT_STORAGE_KEY,
}: {
  motion?: MotionPreference;
  storageKey?: string | null;
}) {
  const code = `(function(){try{var k={none:0,reduced:1,full:2},l="full",c=function(v){if(k[v]<k[l])l=v};c(${JSON.stringify(motion)});${
    storageKey
      ? `try{c(localStorage.getItem(${JSON.stringify(storageKey)}))}catch(e){}`
      : ""
  }if(matchMedia("(prefers-reduced-motion: reduce)").matches)c("reduced");document.documentElement.dataset.motion=l}catch(e){}})()`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
