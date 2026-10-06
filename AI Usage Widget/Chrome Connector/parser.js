// Parse bounded Usage sections only; never scan chats or infer a missing percentage.
(function (root) {
  function parse(text) {
    const lines = text.split(/\r?\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!lines.some(x => /^Plan usage limits\b/i.test(x))) throw Error('Open Claude Settings > Usage (English UI).');
    const matchLabel = line => {
      if (/^Current session$/i.test(line)) return 'Current session';
      if (/^All models$/i.test(line)) return 'Weekly - all models';
      if (/^(Sonnet|Sonnet only)$/i.test(line)) return 'Weekly - Sonnet';
      return null;
    };
    const boundaries = lines.map((line, index) => ({label:matchLabel(line), index})).filter(x => x.label);
    if (!boundaries.length) throw Error('Usage layout not recognized; no data sent.');
    const rows = [];
    for (let i = 0; i < boundaries.length; i++) {
      const {label, index} = boundaries[i];
      const block = lines.slice(index + 1, i + 1 < boundaries.length ? boundaries[i + 1].index : lines.length);
      const end = block.findIndex(x => /^(Last updated|Usage credits|Extra usage)\b/i.test(x));
      const section = end < 0 ? block : block.slice(0, end);
      const percentages = section.map(x => x.match(/^(\d{1,3}(?:\.\d+)?)\s*%\s*used$/i)).filter(Boolean);
      if (percentages.length !== 1) throw Error('Ambiguous or missing usage in ' + label + '; no data sent.');
      const usedPercent = Number(percentages[0][1]);
      if (usedPercent > 100 || rows.some(x => x.label === label)) throw Error('Invalid or duplicate usage row.');
      const resetText = section.find(x => /^(Resets?\b|Starts when a message is sent$)/i.test(x)) || 'Reset time unavailable';
      if (resetText.length > 100) throw Error('Unrecognized reset text.');
      rows.push({label, usedPercent, resetText});
    }
    if (!rows.some(x => x.label === 'Current session') || !rows.some(x => x.label === 'Weekly - all models'))
      throw Error('Incomplete usage page; no data sent.');
    return rows;
  }
  if (typeof module !== 'undefined') module.exports = {parse};
  else root.UsageParser = {parse};
})(globalThis);
