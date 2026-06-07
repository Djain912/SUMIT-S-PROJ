// Safety net: convert any stray LaTeX the model emits into clean plain text,
// so formulas render readably in the chat instead of showing raw \( \text{} \).
// Leaves plain text — and "$100" style currency — untouched.
export function cleanLatex(text: string): string {
  if (!text.includes('\\')) return text;
  let t = text;
  // \frac{A}{B} -> (A) ÷ (B)  (loop for nested cases)
  for (let n = 0; n < 3; n++) {
    t = t.replace(/\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1) ÷ ($2)');
  }
  // \text{...}, \mathrm{...} etc -> keep inner text
  t = t.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, '$1');
  // \sqrt{...} -> √(...)
  t = t.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)');
  // Common math commands -> Unicode
  const sym: Record<string, string> = {
    times: '×', div: '÷', cdot: '·', pm: '±', mp: '∓', leq: '≤', geq: '≥',
    neq: '≠', approx: '≈', equiv: '≡', infty: '∞', sum: 'Σ', prod: 'Π',
    Delta: 'Δ', delta: 'δ', alpha: 'α', beta: 'β', gamma: 'γ', sigma: 'σ',
    mu: 'μ', theta: 'θ', lambda: 'λ', rho: 'ρ', partial: '∂', rightarrow: '→',
    Rightarrow: '⇒', leftarrow: '←', le: '≤', ge: '≥',
  };
  t = t.replace(/\\([a-zA-Z]+)/g, (_m, cmd) => (cmd in sym ? sym[cmd] : ''));
  // Strip math delimiters \( \) \[ \], LaTeX spacing, and leftover braces
  t = t.replace(/\\[()[\]]/g, '').replace(/\\[,;:!> ]/g, ' ');
  t = t.replace(/[{}]/g, '');
  return t.replace(/[ \t]{2,}/g, ' ');
}
