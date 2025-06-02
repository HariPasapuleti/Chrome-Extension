(() => {
  let youtubeLeftControls, youtubePlayer;
  let currentVideo = "";
  let currentVideoBookmarks = [];

  // Extract video ID from URL
  const getVideoId = (url) => {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("v");
  };

  // Fetch bookmarks from Chrome storage
  const fetchBookmarks = () => {
    return new Promise((resolve) => {
      chrome.storage.sync.get([currentVideo], (obj) => {
        console.log("Fetching bookmarks for video:", currentVideo);
        console.log("Storage data:", obj);
        if (chrome.runtime.lastError) {
          console.error("Error fetching bookmarks:", chrome.runtime.lastError);
          resolve([]);
        } else {
          const bookmarks = obj[currentVideo] ? JSON.parse(obj[currentVideo]) : [];
          console.log("Fetched bookmarks:", bookmarks);
          resolve(bookmarks);
        }
      });
    });
  };

  // Add a new bookmark
  const addNewBookmarkEventHandler = async () => {
    if (!youtubePlayer) {
      console.error("YouTube player not found.");
      return;
    }

    // Get current video ID from URL
    currentVideo = getVideoId(window.location.href);
    
    if (!currentVideo) {
      console.error("No video ID available");
      return;
    }

    try {
      const currentTime = youtubePlayer.currentTime;
      const newBookmark = {
        time: currentTime,
        desc: "Bookmark at " + getTime(currentTime),
      };

      console.log("Adding new bookmark:", newBookmark);
      console.log("Current video ID:", currentVideo);
      
      // Get existing bookmarks
      const existingBookmarks = await new Promise((resolve) => {
        chrome.storage.sync.get([currentVideo], (result) => {
          console.log("Storage result:", result);
          const bookmarks = result[currentVideo] ? JSON.parse(result[currentVideo]) : [];
          console.log("Existing bookmarks:", bookmarks);
          resolve(bookmarks);
        });
      });

      // Add new bookmark and sort
      const updatedBookmarks = [...existingBookmarks, newBookmark].sort((a, b) => a.time - b.time);
      console.log("Updated bookmarks to save:", updatedBookmarks);

      // Save to storage
      await new Promise((resolve, reject) => {
        const dataToSave = {};
        dataToSave[currentVideo] = JSON.stringify(updatedBookmarks);
        console.log("Saving data:", dataToSave);
        
        chrome.storage.sync.set(dataToSave, () => {
          if (chrome.runtime.lastError) {
            console.error("Error saving bookmark:", chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.log("Bookmark saved successfully");
            resolve();
          }
        });
      });

      // Verify the save
      chrome.storage.sync.get([currentVideo], (data) => {
        console.log("Verification - Retrieved data after save:", data);
        if (data[currentVideo]) {
          const savedBookmarks = JSON.parse(data[currentVideo]);
          console.log("Saved bookmarks:", savedBookmarks);
        }
      });

      // Notify the popup that bookmarks have been updated
      chrome.runtime.sendMessage({
        type: "BOOKMARKS_UPDATED",
        videoId: currentVideo
      });

    } catch (error) {
      console.error("Error in addNewBookmarkEventHandler:", error);
    }
  };

  // Format time in HH:MM:SS
  const getTime = (timeInSeconds) => {
    const pad = (num) => String(num).padStart(2, "0");
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    return hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  };

  // Handle new video loads
  const newVideoLoaded = async () => {
    // Get current video ID from URL
    currentVideo = getVideoId(window.location.href);
    console.log("New video loaded, ID:", currentVideo);

    if (!currentVideo) {
      console.error("Could not get video ID from URL");
      return;
    }

    currentVideoBookmarks = await fetchBookmarks();

    youtubeLeftControls = document.getElementsByClassName("ytp-left-controls")[0];
    youtubePlayer = document.getElementsByClassName("video-stream")[0];

    if (!youtubeLeftControls || !youtubePlayer) {
      console.error("YouTube controls or player not found. Retrying...");
      setTimeout(newVideoLoaded, 1000);
      return;
    }

    const bookmarkBtnExists = document.getElementsByClassName("bookmark-btn")[0];
    if (!bookmarkBtnExists) {
      const bookmarkBtn = document.createElement("img");
      bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
      bookmarkBtn.className = "ytp-button bookmark-btn";
      bookmarkBtn.title = "Click to bookmark current timestamp";

      youtubeLeftControls.appendChild(bookmarkBtn);
      bookmarkBtn.addEventListener("click", addNewBookmarkEventHandler);
    }
  };

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, value, videoId } = obj;

    if (type === "NEW") {
      currentVideo = videoId;
      newVideoLoaded();
    } else if (type === "PLAY") {
      if (youtubePlayer) {
        youtubePlayer.currentTime = value;
        youtubePlayer.play();
      }
    } else if (type === "DELETE") {
      // Remove the bookmark from storage
      chrome.storage.sync.get([currentVideo], (data) => {
        if (data[currentVideo]) {
          const bookmarks = JSON.parse(data[currentVideo]);
          const updatedBookmarks = bookmarks.filter(bookmark => bookmark.time !== parseFloat(value));
          
          chrome.storage.sync.set({
            [currentVideo]: JSON.stringify(updatedBookmarks)
          }, () => {
            console.log("Bookmark deleted successfully");
            // Send response to acknowledge deletion
            if (response) {
              response({ success: true });
            }
          });
        }
      });
      // Return true to indicate we will send a response asynchronously
      return true;
    }
  });

  // Initial load
  newVideoLoaded();
})();
