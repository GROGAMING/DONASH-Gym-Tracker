import * as React from "react";

/**
 * Returns true when the viewport is below the given breakpoint.
 * Default breakpoint matches common mobile width.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(media.matches);

    update();

    // Safari compatibility
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    } else {
      // @ts-expect-error - older browsers
      media.addListener(update);
      // @ts-expect-error - older browsers
      return () => media.removeListener(update);
    }
  }, [breakpoint]);

  return isMobile;
}
