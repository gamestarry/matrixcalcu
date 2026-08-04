// js/ui/equation-input.js
// Creates/controls the Equation Input Mode panel for RREF.
// Two modes: matrix / equation. Equations map to augmented matrix [A|b].

const VARS = ['x','y','z','w','u','v','t','s','r','q','p','k','m','n'];

const TEXT = {
  en: {
    panelTitle: 'RREF: Equation Input Mode',
    matrixMode: 'Matrix Mode',
    equationMode: 'Equation Mode',
    matrixHint: '<b>Matrix Input Mode:</b> Enter values in <b>Matrix A</b>, then click the <b>RREF</b> button.',
    equations: 'Equations',
    range: '(2-10)',
    calculate: 'Calculate RREF',
    update: 'Update Matrix Inputs',
    load: 'Load from Matrix A',
    tip: 'Tip: Equation Mode maps to an <b>augmented matrix</b> [A|b]. Use <b>Update Matrix Inputs</b> to sync into Matrix A.',
    equationLabel: 'Equation'
  },
  es: {
    panelTitle: 'RREF: modo de ecuaciones',
    matrixMode: 'Modo matriz',
    equationMode: 'Modo ecuaciones',
    matrixHint: '<b>Modo matriz:</b> introduce los valores en la <b>matriz A</b> y haz clic en <b>RREF</b>.',
    equations: 'Ecuaciones',
    range: '(2-10)',
    calculate: 'Calcular RREF',
    update: 'Actualizar las matrices',
    load: 'Cargar desde la matriz A',
    tip: 'Consejo: el modo de ecuaciones se convierte en una <b>matriz aumentada</b> [A|b]. Usa <b>Actualizar las matrices</b> para sincronizarlo con la matriz A.',
    equationLabel: 'Ecuación'
  }
};

function t(key) {
  const lang = ((document.documentElement && document.documentElement.lang) || 'en').toLowerCase();
  const path = window.location && window.location.pathname || '';
  const useSpanish = lang.startsWith('es') &&
    window.PAGE_MODE === 'equation' &&
    /^\/es\/matrix-equations-calculator(?:\.html)?$/.test(path);
  const dict = useSpanish ? TEXT.es : TEXT.en;
  return dict[key] || TEXT.en[key] || key;
}

let state = {
  mode: 'matrix',
  equations: 3,   // 2..10
  vars: 3         // equal to equations for v1
};

function el(id) { return document.getElementById(id); }

export function ensureRrefPanelExists() {
  if (document.getElementById('rref-panel')) return;

  const anchor =
    document.querySelector('.matrix-calculator') ||
    document.getElementById('dynamic-content') ||
    document.body;

  const panel = document.createElement('div');
  panel.id = 'rref-panel';
  panel.style.display = 'none';
  panel.style.marginTop = '16px';
  panel.style.border = '1px solid rgba(0,0,0,0.08)';
  panel.style.borderRadius = '14px';
  panel.style.overflow = 'hidden';
  panel.style.background = '#ffffff';

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:#f5f7ff; border-bottom:1px solid rgba(0,0,0,0.06);">
      <div style="font-weight:800;">${t('panelTitle')}</div>
      <div style="display:flex; gap:8px;">
        <button type="button" data-rref-mode="matrix" style="padding:8px 10px; border-radius:10px; border:1px solid rgba(0,0,0,0.1); background:#fff; font-weight:700; cursor:pointer;">${t('matrixMode')}</button>
        <button type="button" data-rref-mode="equation" style="padding:8px 10px; border-radius:10px; border:1px solid rgba(0,0,0,0.1); background:#fff; font-weight:700; cursor:pointer;">${t('equationMode')}</button>
      </div>
    </div>

    <div id="rref-panel-body" style="padding:14px;">
      <div id="rref-matrix-mode" style="display:block;">
        <div style="color:#334155; line-height:1.5;">
          ${t('matrixHint')}
        </div>
      </div>

      <div id="rref-equation-mode" style="display:none;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
          <div style="font-weight:700;">${t('equations')}</div>
          <button type="button" id="rref-eq-minus" style="width:34px; height:34px; border-radius:10px; border:1px solid rgba(0,0,0,0.12); background:#fff; font-weight:800; cursor:pointer;">−</button>
          <div id="rref-eq-count" style="min-width:20px; text-align:center; font-weight:800;">3</div>
          <button type="button" id="rref-eq-plus" style="width:34px; height:34px; border-radius:10px; border:1px solid rgba(0,0,0,0.12); background:#fff; font-weight:800; cursor:pointer;">+</button>
          <div style="color:#64748b;">${t('range')}</div>
        </div>

        <div id="rref-equations-container"></div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
          <button type="button" id="rref-calc-btn" style="padding:10px 14px; border-radius:12px; border:0; background:#6d28d9; color:#fff; font-weight:800; cursor:pointer;">${t('calculate')}</button>
          <button type="button" id="rref-update-matrix-btn" style="padding:10px 14px; border-radius:12px; border:0; background:#2563eb; color:#fff; font-weight:800; cursor:pointer;">${t('update')}</button>
          <button type="button" id="rref-load-from-matrix-btn" style="padding:10px 14px; border-radius:12px; border:1px solid rgba(0,0,0,0.12); background:#fff; font-weight:800; cursor:pointer;">${t('load')}</button>
        </div>

        <div style="margin-top:12px; color:#64748b; font-size:13px; line-height:1.4;">
          ${t('tip')}
        </div>
      </div>
    </div>
  `;

  const onebar = anchor.querySelector('#mobile-op-onebar');
  const ops = anchor.querySelector('.ops.ops-v2');

  if (onebar && onebar.parentNode === anchor) {
    onebar.insertAdjacentElement('afterend', panel);
  } else if (ops && ops.parentNode === anchor) {
    ops.insertAdjacentElement('beforebegin', panel);
  } else {
    anchor.appendChild(panel);
  }
}

export function initEquationUI() {
  _renderEquations();

  const minus = el('rref-eq-minus');
  const plus = el('rref-eq-plus');
  if (minus) minus.addEventListener('click', () => _setEqCount(state.equations - 1));
  if (plus) plus.addEventListener('click', () => _setEqCount(state.equations + 1));
}

export function setMode(mode) {
  state.mode = mode;

  const m = el('rref-matrix-mode');
  const e = el('rref-equation-mode');
  if (m) m.style.display = (mode === 'matrix') ? 'block' : 'none';
  if (e) e.style.display = (mode === 'equation') ? 'block' : 'none';

  const panel = el('rref-panel');
  if (panel) {
    panel.querySelectorAll('[data-rref-mode]').forEach(btn => {
      btn.style.background = (btn.getAttribute('data-rref-mode') === mode) ? '#0b69ff' : '#fff';
      btn.style.color = (btn.getAttribute('data-rref-mode') === mode) ? '#fff' : '#111827';
      btn.style.borderColor = (btn.getAttribute('data-rref-mode') === mode) ? '#0b69ff' : 'rgba(0,0,0,0.12)';
    });
  }
}

export function getAugmentedMatrixFromEquations() {
  const n = state.equations;
  const v = state.vars;
  const M = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < v; j++) {
      const inp = el(`eq-${i}-c-${j}`);
      row.push(inp ? inp.value.trim() : '0');
    }
    const b = el(`eq-${i}-b`);
    row.push(b ? b.value.trim() : '0');
    M.push(row);
  }
  return M;
}

export function setEquationsFromAugmentedMatrix(A) {
  if (!Array.isArray(A) || !A.length || !Array.isArray(A[0])) return;
  const rows = A.length;
  const cols = A[0].length;
  if (rows < 2 || rows > 10 || cols < 2) return;

  state.equations = Math.max(2, Math.min(10, rows));
  state.vars = Math.max(1, Math.min(VARS.length, cols - 1));

  const count = el('rref-eq-count');
  if (count) count.textContent = String(state.equations);

  _renderEquations();

  for (let i = 0; i < state.equations; i++) {
    for (let j = 0; j < state.vars; j++) {
      const inp = el(`eq-${i}-c-${j}`);
      if (inp && A[i] && A[i][j] != null) inp.value = _fmt(A[i][j]);
    }
    const b = el(`eq-${i}-b`);
    if (b && A[i] && A[i][state.vars] != null) b.value = _fmt(A[i][state.vars]);
  }
}

function _fmt(v) {
  try { return math.format(v); } catch { return String(v); }
}

function _setEqCount(n) {
  const next = Math.max(2, Math.min(10, n));
  state.equations = next;
  state.vars = next; // v1: vars == equations
  const count = el('rref-eq-count');
  if (count) count.textContent = String(state.equations);
  _renderEquations();
}

function _renderEquations() {
  const wrap = el('rref-equations-container');
  if (!wrap) return;
  wrap.innerHTML = '';

  for (let i = 0; i < state.equations; i++) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.flexWrap = 'wrap';
    row.style.gap = '8px';
    row.style.padding = '10px 12px';
    row.style.border = '1px solid rgba(0,0,0,0.08)';
    row.style.borderRadius = '12px';
    row.style.marginBottom = '10px';
    row.style.background = '#f8fafc';

    const label = document.createElement('div');
    label.textContent = `${t('equationLabel')} ${i + 1}:`;
    label.style.fontWeight = '800';
    label.style.width = '110px';
    row.appendChild(label);

    for (let j = 0; j < state.vars; j++) {
      const coeff = document.createElement('input');
      coeff.type = 'text';
      coeff.id = `eq-${i}-c-${j}`;
      coeff.value = '0';
      coeff.style.width = '64px';
      coeff.style.padding = '8px 10px';
      coeff.style.borderRadius = '10px';
      coeff.style.border = '1px solid rgba(0,0,0,0.12)';
      row.appendChild(coeff);

      const varSpan = document.createElement('span');
      varSpan.textContent = ` ${VARS[j] || ('x' + j)} `;
      varSpan.style.fontWeight = '700';
      row.appendChild(varSpan);

      if (j < state.vars - 1) {
        const plus = document.createElement('span');
        plus.textContent = '+';
        plus.style.fontWeight = '700';
        row.appendChild(plus);
      }
    }

    const eq = document.createElement('span');
    eq.textContent = '=';
    eq.style.fontWeight = '900';
    eq.style.marginLeft = '6px';
    row.appendChild(eq);

    const b = document.createElement('input');
    b.type = 'text';
    b.id = `eq-${i}-b`;
    b.value = '0';
    b.style.width = '72px';
    b.style.padding = '8px 10px';
    b.style.borderRadius = '10px';
    b.style.border = '1px solid rgba(0,0,0,0.12)';
    b.style.marginLeft = '6px';
    row.appendChild(b);

    wrap.appendChild(row);
  }
}
