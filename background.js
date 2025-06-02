// Service worker initialization
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && tab.url.includes("youtube.com/watch")) {
    try {
      const queryParameters = tab.url.split("?")[1];
      const urlParameters = new URLSearchParams(queryParameters);
      const videoId = urlParameters.get("v");
      
      if (videoId) {
        console.log("Sending video ID to content script:", videoId);
        chrome.tabs.sendMessage(tabId, {
          type: "NEW",
          videoId: videoId,
        }).catch(error => {
          console.error("Error sending message to content script:", error);
        });
      }
    } catch (error) {
      console.error("Error processing tab update:", error);
    }
  }
});
