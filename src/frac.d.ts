export function setMath(el: Element, text: string): void;
export function fracHTML(text: string): string;
export function fracSpeech(text: string): string;
export function mathCanvas(text: string, o?: { size?: number; color?: string; font?: string; weight?: string; pad?: number; scale?: number }): HTMLCanvasElement;
export function injectFracCSS(doc?: Document): void;
export const FRAC_CSS: string;
