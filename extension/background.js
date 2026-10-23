// Background service worker for Rocko Global Hotkeys
chrome.commands.onCommand.addListener(async (command) => {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url && (tab.url.includes('localhost:') || tab.url.includes('127.0.0.1:'))) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'ROCKO_COMMAND',
          command: command
        }).catch(() => {
          // tab might not be active or loaded yet
        });
      }
    }
  } catch (err) {
    console.error('Error broadcasting global hotkey command:', err);
  }
});
