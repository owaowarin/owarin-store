async function render() {
  const data = await chrome.storage.local.get(['status','lastSent','autoRefresh']);
  document.querySelector('#status').textContent = data.status || 'Run Setup, then open Claude Usage.';
  document.querySelector('#time').textContent = data.lastSent ? 'Last delivered: ' + new Date(data.lastSent).toLocaleString() : 'No data delivered yet';
  document.querySelector('#auto').checked = data.autoRefresh !== false;
}
document.querySelector('#auto').addEventListener('change',e => chrome.storage.local.set({autoRefresh:e.target.checked}));
document.querySelector('#open').addEventListener('click',async () => {
  const tabs = await chrome.tabs.query({url:'https://claude.ai/settings/usage*'});
  if (tabs.length) {await chrome.tabs.update(tabs[0].id,{active:true});await chrome.tabs.reload(tabs[0].id);}
  else await chrome.tabs.create({url:'https://claude.ai/settings/usage'});
});
chrome.storage.onChanged.addListener(render);
render();
