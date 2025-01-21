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
  } else if (request.action === 'injectMatchReport') {
    injectMatchReport(request, sendResponse);
  }

  return true;
});

function injectMatchReport(request, sendResponse) {
  const leftoverMatchDiv = document.querySelector('#jobSkillsMatcher');
  if (leftoverMatchDiv) {
    leftoverMatchDiv.remove();
  }

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

  const div = document.createElement('div');
  div.id = 'jobSkillsMatcher';
  div.innerHTML = request.matchReportHTML;
  targetParent.appendChild(div);
  
  sendResponse({ success: true, message: 'Job Skills Matcher report appended' });
}