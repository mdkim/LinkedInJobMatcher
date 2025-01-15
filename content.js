function extractLinkedInJobDetails() {
  // LinkedIn job details selector (may need adjustment based on their current HTML structure)
  const jobTitleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title');
  const companyNameEl = document.querySelector('.job-details-jobs-unified-top-card__company-name');
  const locationEl = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container .tvm__text--low-emphasis');
  const jobDescriptionEl = document.querySelector('.jobs-description__container');

  return {
    title: jobTitleEl ? jobTitleEl.textContent.trim() : 'N/A',
    company: companyNameEl ? companyNameEl.textContent.trim() : 'N/A',
    location: locationEl ? locationEl.textContent.trim() : 'N/A',
    description: jobDescriptionEl ? jobDescriptionEl.innerText.trim() : 'N/A'
  };
}

function extractGenericJobDetails() {
  // More generic extraction for other job sites
  return {
    title: document.title,
    url: window.location.href,
    pageText: document.body.innerText
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractJobDetails") {
    let jobDetails;
    
    // Try LinkedIn-specific extraction first
    if (window.location.href.includes('linkedin.com/jobs')) {
      jobDetails = extractLinkedInJobDetails();
    } else {
      // Fallback to generic extraction
      jobDetails = extractGenericJobDetails();
    }

    sendResponse({jobDetails: jobDetails});
  }
  return true;
});
