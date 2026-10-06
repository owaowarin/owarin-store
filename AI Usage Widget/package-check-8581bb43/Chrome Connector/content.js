(() => {
  if (location.pathname.replace(/\/$/, '') !== '/settings/usage') return;
  let last = '', debounce;
  function inspect() {
    try {
      const scope = [...document.querySelectorAll('[role="dialog"],main')].find(x =>
        /Plan usage limits/i.test(x.innerText || ''));
      if (!scope) throw Error('Waiting for Claude Usage to load. Sign in if requested.');
      const rows = UsageParser.parse(scope.innerText);
      const fingerprint = JSON.stringify(rows);
      if (last === fingerprint) return; // Do not renew freshness by rereading unchanged stale DOM.
      last = fingerprint;
      chrome.runtime.sendMessage({kind:'usage',snapshot:{version:2,provider:'claude',
        source:'claude.ai/settings/usage',observedAt:new Date().toISOString(),rows}})
        .catch(() => {});
    } catch (error) {
      chrome.runtime.sendMessage({kind:'status',error:error.message}).catch(() => {});
    }
  }
  const observer = new MutationObserver(() => {
    clearTimeout(debounce); debounce = setTimeout(inspect, 1200);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  setTimeout(inspect, 1500);
})();
