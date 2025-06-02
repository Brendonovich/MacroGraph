import { isMobile } from "@solid-primitives/platform";

export const isTouchDevice = isMobile || navigator.maxTouchPoints > 0;
