import { parseAsStringEnum } from "nuqs";

/**
 * URL state for the panels that can open over a route.
 *
 * The panel lives in the address bar rather than in component state so that the
 * link can be shared, a refresh restores it, and the browser Back button closes
 * it. The cost is that a visitor can type anything into the address bar, so the
 * value is parsed through a typed parser: an unrecognised value becomes `null`
 * and never reaches a component.
 */

/** Query parameter that carries which panel, if any, is open. */
export const PANEL_KEY = "panel";

/**
 * The only panel that exists today. A second panel adds a value here and a
 * component to render it, and nothing else changes here.
 */
export const PANEL_SETTINGS = "settings";

/**
 * Typed parser for the panel parameter.
 *
 * Note what this cannot do: it returns `null` both for a parameter that is
 * absent and for one whose value it does not recognise. A caller that needs to
 * tell those apart (to strip a bad value from the address bar) must also read
 * the raw presence of the key, which is what `PANEL_KEY` is exported for.
 */
export const panelParam = parseAsStringEnum([PANEL_SETTINGS]);
