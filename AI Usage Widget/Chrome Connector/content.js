(() => {
  if (location.pathname.replace(/\/$/, '') !== '/settings/usage') return;
  let last = '', debounce, retry, pending, inFlight = false;
  async function inspect() {
    if (inFlight) return;
    clearTimeout(retry);
    if (location.pathname.replace(/\/$/, '') !== '/settings/usage') {
      pending = null;
      return;
    }
    try {
      const scope = [...document.querySelectorAll('[role="dialog"],main')].find(x =>
        /Plan usage limits/i.test(x.innerText || ''));
      if (!scope) throw Error('Waiting for Claude Usage to load. Sign in if requested.');
      const rows = UsageParser.parse(scope.innerText);
      const fingerprint = JSON.stringify(rows);
      if (last === fingerprint) return; // Do not renew freshness by rereading unchanged stale DOM.
      if (pending?.fingerprint !== fingerprint) pending = {fingerprint,snapshot:{version:2,provider:'claude',
        source:'claude.ai/settings/usage',observedAt:new Date().toISOString(),rows}};
    } catch (error) {
      pending = null;
      chrome.runtime.sendMessage({kind:'status',error:error.message}).catch(() => {});
      return;
    }
    inFlight = true;
    let delivered = false;
    try {
      // Retries retain the original observation time; an unchanged DOM is not fresh data.
      const result = await chrome.runtime.sendMessage({kind:'usage',snapshot:pending.snapshot});
      if (result?.ok === true) { last = pending.fingerprint; pending = null; delivered = true; }
    } catch (_) { /* Keep the pending observation for a bounded-rate retry. */ }
    finally {
      inFlight = false;
      // Reinspect after success too, in case the page changed while delivery was in flight.
      retry = setTimeout(inspect, delivered ? 1200 : 30000);
    }
  }
  const observer = new MutationObserver(() => {
    clearTimeout(debounce); debounce = setTimeout(inspect, 1200);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  setTimeout(inspect, 1500);
})();
