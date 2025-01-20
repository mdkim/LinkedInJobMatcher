function extractLinkedInJobDetails() {
  const jobTitleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title');
  const companyNameEl = document.querySelector('.job-details-jobs-unified-top-card__company-name');
  const locationEl = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container'); // .tvm__text--low-emphasis
  const jobDescriptionEl = document.querySelector('.jobs-description__container');

  return {
    title: jobTitleEl ? jobTitleEl.textContent.trim() : 'N/A',
    company: companyNameEl ? companyNameEl.textContent.trim() : 'N/A',
    location: locationEl ? locationEl.textContent.trim() : 'N/A',
    description: jobDescriptionEl ? jobDescriptionEl.innerText.trim() : 'N/A'
  };
}

function extractGenericJobDetails() {
  return {
    title: document.title,
    url: window.location.href,
    pageText: document.body.innerText
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractJobDetails") {
    let jobDetails;

    // add to content_scripts.matches in manifest.json
    if (window.location.href.includes('linkedin.com/jobs')) {
      jobDetails = extractLinkedInJobDetails();
    } else {
      jobDetails = extractGenericJobDetails();
    }
 
    sendResponse({ jobDetails: jobDetails });
  } else if (request.action === 'appendElement') {
    const leftoverMatchDiv = document.querySelector('#matchReportDiv');
    if (leftoverMatchDiv) {
      leftoverMatchDiv.remove();
    }

    //const parentDiv = document.querySelector('.job-details-jobs-unified-top-card__container--two-pane');
    const saveButtons = document.querySelectorAll('.jobs-save-button');
    let targetParent;
    for (const saveButton of saveButtons) {
      const displayFlex = saveButton.parentElement;
      const mt4Element = displayFlex?.parentElement;
      const potentialTarget  = mt4Element?.parentElement;
      if (mt4Element?.classList.contains('mt4')) {
        targetParent = potentialTarget;
        break;
      }
    }
    if (!targetParent) {
      sendResponse({ success: false, message: 'Save(d) Job button not found' });
      return;
    }

    const matchReportDiv = document.createElement('div');
    matchReportDiv.id = 'matchReportDiv';
    matchReportDiv.innerHTML = request.matchReportHTML;
    targetParent.appendChild(matchReportDiv);
    sendResponse({ success: true, message: 'matchReport appended' });
  }

  return true;
});
