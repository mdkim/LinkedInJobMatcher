document.getElementById('extractBtn').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: "extractJobDetails"}, (response) => {
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
