/**
 * Visuele voortgangsbalk (Discord + website).
 * @returns {{ bar: string, scale: string, percent: number, filled: number, width: number }}
 */
function buildPlayerBar(current, max, width = 16) {
  const safeMax = max && max > 0 ? max : 128;
  const safeCurrent = Math.max(0, Number(current) || 0);
  const pct = Math.min(1, safeCurrent / safeMax);
  let filled = Math.round(pct * width);
  if (safeCurrent > 0 && filled === 0) filled = 1;
  if (safeCurrent >= safeMax) filled = width;
  const empty = Math.max(0, width - filled);
  const bar = '🟩'.repeat(filled) + '⬛'.repeat(empty);
  const dots = '·'.repeat(Math.max(0, width - 1));
  const scale = `\`0\` ${dots} \`${safeMax}\``;

  return {
    bar,
    scale,
    percent: Math.round(pct * 100),
    filled,
    width,
  };
}

module.exports = { buildPlayerBar };
