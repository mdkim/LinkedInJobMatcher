# Job Page Content Extractor Chrome Extension

## Features
- Extract job details from LinkedIn and other job sites
- Simple, one-click extraction of job information

## Installation
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" and select this extension directory

## Usage
1. Navigate to a job listing page
2. Click the extension icon
3. Press "Extract Job Details" button
4. View extracted job information in the popup

## Supported Sites
- LinkedIn Jobs
- Generic job sites (fallback mode)

## Notes
- May require updates as website structures change
- Currently extracts basic job details like title, company, location, and description

---

## Dev notes

📦 Project Structure:

- manifest.json: Defines extension metadata and permissions
- popup.html: User interface for the extension
- popup.js: Handles user interactions and messaging
- content.js: Extracts job details from web pages
- background.js: Manages extension lifecycle
- README.md: Installation and usage instructions
- images/: Placeholder icons for the extension

🔍 Key Features:

- Extracts job details from LinkedIn and other job sites
- Simple, one-click extraction of job information
- Flexible extraction strategy (LinkedIn-specific and generic)

🚀 How It Works:

- When you click the extension icon, it sends a message to the active tab
- The content script extracts job details based on the current page
- Details are displayed in the popup window
