document.getElementById('extractBtn').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    // inject content script
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      files: ['content.js']
    }, () => {
      // send message after script injection
      chrome.tabs.sendMessage(tabs[0].id, {action: "extractJobDetails"}, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          document.getElementById('jobDetails').innerHTML = `
            <h3>Error</h3>
            <p>Could not extract job details. Error: ${chrome.runtime.lastError.message}</p>
          `;
          return;
        }

        if (response && response.jobDetails) {
          document.getElementById('jobDetails').innerHTML = `
            <h3>Job Details:</h3>
            <pre>${JSON.stringify(response.jobDetails, null, 2)}</pre>
          `;
        } else {
          document.getElementById('jobDetails').innerHTML = 'No job details found.';
        }
      });
    });
  });
});
