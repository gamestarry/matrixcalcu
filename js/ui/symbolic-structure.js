// js/ui/symbolic-structure.js
// Symbolic structure layer (Strategy A):
// - Show ONLY compact structural identities (no series expansions)
// - For: tangent, arcsine, arccosine, arctangent, logarithm
// - Keep it lightweight and never block numeric rendering

const OP_TITLES = {
  tangent: "tan(A)",
  arctangent: "arctan(A)",
  logarithm: "log(A)",
  arcsine: "arcsin(A)",
  arccosine: "arccos(A)"
};

// Strategy A: only short structural relationships (no long expansions)
const SYMBOLIC_LINES = {
  tangent: [
    "tan(A) = sin(A) · (cos(A))⁻¹",
    "Note: tan(A) may be undefined or unstable if cos(A) is singular or near-singular."
  ],
  arcsine: [
    "X = arcsin(A)  ⇔  sin(X) = A  (principal branch)"
  ],
  arccosine: [
    "X = arccos(A)  ⇔  cos(X) = A  (principal branch)"
  ],
  arctangent: [
    "arctan(A) = (1/(2i)) · [ log(I + iA) − log(I − iA) ]",
    "Note: This identity involves complex numbers (i = √−1)."
  ],
  logarithm: [
    "X = log(A)  ⇔  exp(X) = A  (principal logarithm)",
    "Note: Matrix logarithm is branch-dependent; not all matrices have a real logarithm."
  ]
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeOp(op) {
  if (!op) return "";
  const x = String(op).trim().toLowerCase();

  // common aliases
  if (x === "tan" || x === "tangent") return "tangent";
  if (x === "arctan" || x === "atan" || x === "arctangent") return "arctangent";
  if (x === "asin" || x === "arcsin" || x === "arcsine") return "arcsine";
  if (x === "acos" || x === "arccos" || x === "arccosine") return "arccosine";
  if (x === "log" || x === "ln" || x === "logarithm") return "logarithm";

  return x;
}

function buildPanel(opKey) {
  const lines = SYMBOLIC_LINES[opKey];
  if (!lines || !lines.length) return null;

  const title = OP_TITLES[opKey] || "Symbolic structure";

  const container = document.createElement("section");
  container.className = "symbolic-panel";
  container.setAttribute("aria-label", "Symbolic structure");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "symbolic-toggle";
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML =
    'Show symbolic structure <span class="symbolic-caret" aria-hidden="true">▾</span>';

  const content = document.createElement("div");
  content.className = "symbolic-content";
  content.hidden = true;

  const h = document.createElement("div");
  h.className = "symbolic-title";
  h.textContent = title;

  const pre = document.createElement("pre");
  pre.className = "symbolic-pre";
  pre.innerHTML = escapeHtml(lines.join("\n"));

  content.appendChild(h);
  content.appendChild(pre);

  btn.addEventListener("click", () => {
    const expanded = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!expanded));
    content.hidden = expanded;
  });

  container.appendChild(btn);
  container.appendChild(content);

  return container;
}

/**
 * Attach symbolic structure panel into a result container.
 * This must never throw to avoid breaking numeric output.
 *
 * @param {HTMLElement} resultEl - container where numeric output is already rendered
 * @param {string} op - operation name or alias, e.g. "tangent", "tan", "log"
 */
export function attachSymbolicStructure(resultEl, op) {
  try {
    if (!resultEl) return;

    const opKey = normalizeOp(op);
    const panel = buildPanel(opKey);
    if (!panel) return;

    // Avoid duplicates (re-render safe)
    const old = resultEl.querySelector(":scope > .symbolic-panel");
    if (old) old.remove();

    resultEl.appendChild(panel);
  } catch (e) {
    // fail silently; symbolic layer is optional
  }
}

// exported for debugging/testing if needed
export const __symbolic = { normalizeOp };