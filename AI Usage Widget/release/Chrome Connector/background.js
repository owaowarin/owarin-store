const HOST = 'com.aiusage.widget';
async function status(text, good = false) {
  await chrome.storage.local.set({status:text});
  await chrome.action.setBadgeText({text:good ? 'OK' : '!'});
  await chrome.action.setBadgeBackgroundColor({color:good ? '#287c60' : '#9a582b'});
}
async function deliver(snapshot) {
  try {
    const result = await chrome.runtime.sendNativeMessage(HOST, snapshot);
    if (!result?.ok) throw Error(result?.error || 'Native connector rejected the data.');
    await chrome.storage.local.set({lastSent:snapshot.observedAt});
    await status('Connected - usage delivered to the widget.', true);
  } catch (error) { await status('Run Setup to register the connector. ' + error.message); }
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!sender.tab || !sender.url) return;
  const url = new URL(sender.url);
  if (url.origin !== 'https://claude.ai' || url.pathname.replace(/\/$/, '') !== '/settings/usage') return;
  if (message?.kind === 'usage' && message.snapshot?.provider === 'claude')
    deliver(message.snapshot).then(() => reply({ok:true}));
  else if (message?.kind === 'status') status(String(message.error).slice(0,200)).then(() => reply({ok:true}));
  else return;
  return true;
});
chrome.runtime.onInstalled.addListener(async () => {
  const options = await chrome.storage.local.get('autoRefresh');
  if (options.autoRefresh === undefined) await chrome.storage.local.set({autoRefresh:true});
  await chrome.alarms.create('usage-refresh', {periodInMinutes:1});
  await status('Open Claude Settings > Usage, then refresh that tab.');
});
chrome.runtime.onStartup.addListener(() => chrome.alarms.create('usage-refresh',{periodInMinutes:1}));
chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== 'usage-refresh' || !(await chrome.storage.local.get('autoRefresh')).autoRefresh) return;
  const tabs = await chrome.tabs.query({url:'https://claude.ai/settings/usage*'});
  for (const tab of tabs)
    if (!tab.active && new URL(tab.url).pathname.replace(/\/$/, '') === '/settings/usage')
      await chrome.tabs.reload(tab.id).catch(() => {});
  if (!tabs.length) await status('Claude Usage tab is closed. Last data will become stale.');
});
