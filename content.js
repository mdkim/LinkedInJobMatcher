function extractLinkedInJobDetails() {
  const jobTitleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title');
  const companyNameEl = document.querySelector('.job-details-jobs-unified-top-card__company-name');
  const locationEl = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container'); // .tvm__text--low-emphasis
  const jobDescriptionEl = document.querySelector('.jobs-description__container');

  return {
    title: jobTitleEl ? jobTitleEl.textContent.trim() : 'N/A',
    company: companyNameEl ? companyNameEl.textContent.trim() : 'N/A',
    location: locationEl ? locationEl.textContent.trim() : 'N/A',
    description: jobDescriptionEl ? jobDescriptionEl.innerText.trim() : 'N/A',
    type: 'linkedin'
  };
}

function extractXJobDetails() {
  const divParent = getXParentDiv().parentNode;

  const jobTitleEl = divParent.querySelector('div > div > div[dir="ltr"] > span');
  const companyNameEl = divParent.querySelector('div > div + div > div[dir="ltr"] > span');
  const locationEl = divParent.querySelector('div > div > div + div[dir="ltr"] > span');
  const jobDescriptionEl = divParent.querySelector('.extended-profile .DraftEditor-root .DraftEditor-editorContainer');

  return {
    title: jobTitleEl ? jobTitleEl.textContent.trim() : 'N/A',
    company: companyNameEl ? companyNameEl.textContent.trim() : 'N/A',
    location: locationEl ? locationEl.textContent.trim() : 'N/A',
    description: jobDescriptionEl ? jobDescriptionEl.innerText.trim() : 'N/A',
    type: 'x'
  };
}

function getXParentDiv() {
  const applyNowNode = Array.from(document.querySelectorAll('a div[dir="ltr"] span span'))
    .find(node => node.textContent.trim() === 'Apply now');
  return divParent = applyNowNode.closest('a').parentNode;
}

function extractGenericJobDetails() {
  console.group("Generic job details");
  console.groupEnd();
  return {
    title: "Unknown",
    company: "Unknown",
    location: "Unknown",
    description: document.body.innerText,
    type: 'generic'
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractJobDetails") {
    let jobDetails;

    // add to content_scripts.matches in manifest.json
    if (window.location.href.includes('linkedin.com/jobs')) {
      jobDetails = extractLinkedInJobDetails();
    } else if (window.location.href.includes('x.com/jobs')) {
      jobDetails = extractXJobDetails();
    } else{
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

  const div = document.createElement('div');
  div.id = 'jobSkillsMatcher';
  div.innerHTML = request.matchReportHTML;

  if (window.location.href.includes('linkedin.com/jobs')) {
    const saveButtons = document.querySelectorAll('.jobs-save-button');
    let targetParent;
    for (const saveButton of saveButtons) {
      const mt4Element = saveButton.parentElement?.parentElement;
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
    targetParent.appendChild(div);
  } else if (window.location.href.includes('x.com/jobs')) {
    div.style.padding = '24px';
    div.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";
    div.style.fontSize = '12px';
    const divParent = getXParentDiv();
    divParent.parentNode.insertBefore(div, divParent.nextSibling.nextSibling)
  }

  // start animation
  setTimeout(() => {
    const matchReport = document.getElementById('matchReport');
    const matchReportBox = document.getElementById('matchReportBox');
    matchReportBox.style.transition = 'height 0.7s ease-out';
    matchReportBox.style.display = 'block';
    matchReportBox.style.height = matchReport.scrollHeight + 'px';
  }, 150);
  
  sendResponse({ success: true, message: 'Job Skills Matcher report appended' });
}