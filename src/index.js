import { parseUnifiedDiff } from "./parse.js";
import { renderPostcard } from "./render.js";

export { parseUnifiedDiff } from "./parse.js";
export { renderPostcard } from "./render.js";

/**
 * @param {string} diffText
 * @param {import('./render.js').RenderOptions} [options]
 * @returns {string}
 */
export function diffToHtml(diffText, options) {
  return renderPostcard(parseUnifiedDiff(diffText), options);
}
