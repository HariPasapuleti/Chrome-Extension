# YouTube Timestamp Bookmark Extension

A Chrome extension to bookmark specific timestamps in YouTube videos and access them easily.

## Features
- Save timestamps while watching YouTube videos.
- View, play, or delete bookmarks via the extension popup.
- Sync bookmarks across devices using Chrome's sync storage.

## Installation
1. Download or clone this repository.
2. Go to `chrome://extensions/` in Chrome.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the extension folder.

## How to Use
1. Open a YouTube video.
2. Click the bookmark button in the video controls to save the current timestamp.
3. Open the extension popup to view or manage bookmarks.

## File Overview
- `manifest.json`: Extension configuration.
- `background.js`: Handles tab updates.
- `contentscript.js`: Adds bookmark functionality to YouTube.
- `popup.html`, `popup.js`: Popup interface.
- `styles.css`: Popup styling.
- `assets/`: Icons and images.

## Permissions
- `tabs`: Access the active tab's URL.
- `storage`: Save and retrieve bookmarks.

---

Enjoy your YouTube bookmarking experience!
