import * as React from "react";

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(media.matches);

    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    // Older browsers
    // @ts-ignore
    media.addListener(update);
    // @ts-ignore
    return () => media.removeListener(update);
  }, [breakpoint]);

  return isMobile;
}
