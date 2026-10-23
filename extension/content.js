// Content script injected into Rocko tab
chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === 'ROCKO_COMMAND') {
    // Dispatch via CustomEvent
    window.dispatchEvent(new CustomEvent('rocko-hotkey-command', {
      detail: { action: message.command }
    }));

    // Also dispatch via postMessage for cross-world reliability
    window.postMessage({
      source: 'rocko-extension',
      action: message.command
    }, '*');
  }
});
