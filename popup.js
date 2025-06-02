import { getActiveTabURL } from "./utils.js";

const addNewBookmark = (bookmarks, bookmark) => {
  const bookmarkTitleElement = document.createElement("div");
  const controlsElement = document.createElement("div");
  const newBookmarkElement = document.createElement("div");

  bookmarkTitleElement.textContent = bookmark.desc;
  bookmarkTitleElement.className = "bookmark-title";
  controlsElement.className = "bookmark-controls";

  setBookmarkAttributes("play", onPlay, controlsElement);
  setBookmarkAttributes("delete", onDelete, controlsElement);

  newBookmarkElement.id = "bookmark-" + bookmark.time;
  newBookmarkElement.className = "bookmark";
  newBookmarkElement.setAttribute("timestamp", bookmark.time);

  newBookmarkElement.appendChild(bookmarkTitleElement);
  newBookmarkElement.appendChild(controlsElement);
  bookmarks.appendChild(newBookmarkElement);
};

const viewBookmarks = (currentBookmarks=[]) => {
  const bookmarksElement = document.getElementById("bookmarks");
  bookmarksElement.innerHTML = "";

  if (currentBookmarks.length > 0) {
    for (let i = 0; i < currentBookmarks.length; i++) {
      const bookmark = currentBookmarks[i];
      addNewBookmark(bookmarksElement, bookmark);
    }
  } else {
    bookmarksElement.innerHTML = '<div class="title">No bookmarks to show</div>';
  }
};

const onPlay = async e => {
  const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
  const activeTab = await getActiveTabURL();

  chrome.tabs.sendMessage(activeTab.id, {
    type: "PLAY",
    value: bookmarkTime,
  }, () => {
    // Close popup after sending play message
    window.close();
  });
};

const onDelete = async e => {
  try {
    const activeTab = await getActiveTabURL();
    const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
    const videoId = new URL(activeTab.url).searchParams.get("v");
    
    if (!videoId) {
      console.error("No video ID found");
      return;
    }

    // Get current bookmarks
    const data = await new Promise((resolve) => {
      chrome.storage.sync.get([videoId], (result) => {
        resolve(result);
      });
    });

    if (data[videoId]) {
      const currentBookmarks = JSON.parse(data[videoId]);
      const updatedBookmarks = currentBookmarks.filter(bookmark => bookmark.time !== parseFloat(bookmarkTime));

      // Save updated bookmarks
      await new Promise((resolve) => {
        chrome.storage.sync.set({
          [videoId]: JSON.stringify(updatedBookmarks)
        }, resolve);
      });

      // Update UI
      const bookmarkElementToDelete = document.getElementById("bookmark-" + bookmarkTime);
      if (bookmarkElementToDelete) {
        bookmarkElementToDelete.parentNode.removeChild(bookmarkElementToDelete);
      }

      // If no bookmarks left, show message
      if (updatedBookmarks.length === 0) {
        const bookmarksElement = document.getElementById("bookmarks");
        bookmarksElement.innerHTML = '<div class="title">No bookmarks to show</div>';
      }

      // Notify content script
      try {
        await chrome.tabs.sendMessage(activeTab.id, {
          type: "DELETE",
          value: bookmarkTime,
          videoId: videoId
        });
      } catch (error) {
        console.log("Content script not ready, but bookmark deleted successfully");
      }
    }
  } catch (error) {
    console.error("Error deleting bookmark:", error);
  }
};

const setBookmarkAttributes = (src, eventListener, controlParentElement) => {
  const controlElement = document.createElement("img");

  controlElement.src = "assets/" + src + ".png";
  controlElement.title = src;
  controlElement.addEventListener("click", eventListener);
  controlParentElement.appendChild(controlElement);
};

document.addEventListener("DOMContentLoaded", async () => {
  const activeTab = await getActiveTabURL();
  const container = document.getElementsByClassName("container")[0];

  if (activeTab.url.includes("youtube.com/watch")) {
    // Extract video ID from URL using regex
    const videoIdMatch = activeTab.url.match(/[?&]v=([^&]+)/);
    const currentVideo = videoIdMatch ? videoIdMatch[1] : null;
    
    console.log("Current Video ID in Popup:", currentVideo);

    if (currentVideo) {
      // Function to load and display bookmarks
      const loadBookmarks = () => {
        console.log("Loading bookmarks for video:", currentVideo);
        const bookmarksElement = document.getElementById("bookmarks");
        
        if (!bookmarksElement) {
          console.error("Bookmarks element not found");
          return;
        }

        chrome.storage.sync.get([currentVideo], (data) => {
          if (chrome.runtime.lastError) {
            console.error("Error loading bookmarks:", chrome.runtime.lastError);
            bookmarksElement.innerHTML = '<div class="title">Error loading bookmarks</div>';
            return;
          }
          
          console.log("Raw storage data:", data);
          let currentVideoBookmarks = [];
          
          try {
            if (data[currentVideo]) {
              currentVideoBookmarks = JSON.parse(data[currentVideo]);
              console.log("Parsed bookmarks:", currentVideoBookmarks);
              
              if (Array.isArray(currentVideoBookmarks) && currentVideoBookmarks.length > 0) {
                viewBookmarks(currentVideoBookmarks);
              } else {
                bookmarksElement.innerHTML = '<div class="title">No bookmarks to show</div>';
              }
            } else {
              console.log("No bookmarks found for this video");
              bookmarksElement.innerHTML = '<div class="title">No bookmarks to show</div>';
            }
          } catch (error) {
            console.error("Error parsing bookmarks:", error);
            bookmarksElement.innerHTML = '<div class="title">Error parsing bookmarks</div>';
          }
        });
      };

      // Initial load
      loadBookmarks();

      // Listen for bookmark updates
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "BOOKMARKS_UPDATED" && message.videoId === currentVideo) {
          console.log("Received bookmark update notification");
          loadBookmarks();
        }
      });
    } else {
      container.innerHTML = '<div class="title">Could not extract video ID.</div>';
    }
  } else {
    container.innerHTML = '<div class="title">This is not a YouTube video page.</div>';
  }
});

// Ready to deploy.