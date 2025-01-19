# LinkedIn Job Skills Matcher Chrome Extension

## Key Features
- 🌟 Extract job details from LinkedIn
- 🤖 Leverage AI for intelligent resume matching
- 📈 Instantly assess skill alignment with job descriptions

## Getting Started
1. **Prerequisites**
   - Google Chrome Browser
   - OpenAI API Key (store in Chrome local storage)

2. **Installation Steps**
   - Clone the repository to your local machine
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" via the toggle in the top right corner
   - Click "Load unpacked" and select the extension directory
   - Store your OpenAI API Key in Chrome's local storage

```javascript   
chrome.storage.local.set({ OPENAI_API_KEY: '<your_api_key>' },
  () => {
    console.log('API key stored successfully!');
  });
chrome.storage.local.get(['OPENAI_API_KEY'], (result) => {
  console.log('Stored API key:', result.OPENAI_API_KEY);
});
```

## How to Use
1. Visit a LinkedIn job listing
2. Click the extension icon in the browser toolbar
3. Receive a comprehensive AI-generated resume match report:
   - **Match percentage**: percentage of skills in the job description found in the resume
   - **Skills matches**: list of skills and certifications from the resume that closely matches with the job description
   - **Missing skills**: list of skills and certifications in the job description not found in the resume
   - **Additional notes**: any additional insights or recommendations from the AI model

## Supported Platforms
- LinkedIn Jobs
- Expandable to other job platforms

## Technical Overview
- **Technologies Used**: JavaScript, Chrome Extension API, OpenAI GPT-3.5 Turbo
- **Configuration**: Adjust `DEBUG` flag in `popup.js` for detailed logging

## Challenges & Considerations
- Manual setup of OpenAI API key required
- Accuracy influenced by resume content
- Adaptability to changing web structures

## Future Enhancements
- Broader job platform support
- User-friendly resume input interface
- Improved AI matching algorithms

## License
This project is licensed under the MIT License.
