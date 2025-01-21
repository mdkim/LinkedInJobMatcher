let OPENAI_API_KEY;
loadApiKey((apiKey) => {
  OPENAI_API_KEY = apiKey;
});
const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-3.5-turbo';
const DEBUG = false;

function debugLog(...args) {
  if (!DEBUG) return;
  console.log(...args);
}

function loadApiKey(callback) {
  let OPENAI_API_KEY;
  try {
    chrome.storage.local.get('OPENAI_API_KEY', (result) => {
      if (!result.OPENAI_API_KEY) {
        handleError('OpenAI API Key not found in local storage');
        return;
      }
      OPENAI_API_KEY = result.OPENAI_API_KEY;
      callback(OPENAI_API_KEY);
    });
  } catch (error) {
    handleError('Error accessing local storage', error);
  }
};

document.getElementById('closePopupBtn').addEventListener('click', () => {
  window.close();
});

function handleError(message, error = new Error()) {
  console.error(message, error);
  document.getElementById('matchReportBox').style.display = 'block';

  const div = document.createElement('div');
  div.innerHTML = `<p class="error">${message}<br>Error: ${error.message}</p>`;
  document.getElementById('matchReportBox').appendChild(div);
}

function extractJobDetails() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "extractJobDetails"}, (response) => {
        if (chrome.runtime.lastError) {
          handleError('Runtime error', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        if (response && response.jobDetails) {
          resolve(response.jobDetails);
        } else {
          reject(new Error('No job details found'));
        }
      });
    });
  });
}

async function fetchMatchReport(jobDetails) {
  debugLog("Job Details: ", jobDetails);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system", 
          content: "You are a software engineering recruiter providing concise, bullet-pointed reports comparing a resume skills summary to a job description."
        },
        {
          role: "user",
          content: `Analyze this job description and provide a concise match report against a resume skills summary, focusing on hard skills and specific high level skills. If the job description lacks skills content, skip providing sections 1-4 and only report that the job description is invalid.

Job Description:
"""
${jobDetails.description}
"""

Resume Skills Summary:
- SKILLS: Java, Spring Boot, Python, PyTorch, Pandas, PHP, Node.js, Javascript, React, LitElement, jQuery, REST API, Git, CSS, HTML, MySQL, DynamoDB, Hive, HQL+, Airflow, Docker, Grails, Gradle, Groovy, Android SDK
- CERTIFICATION: Udacity Nanodegree - AI Programming with Python, Baeldung Certificate - Java Spring, AWS Certified Developer – Associate, AWS Serverless – Badge

Provide a brief report with the following sections:
1. **Match percentage**: A single percentage value for skills match, without explanation.
2. **Skills matches**: A list of skills and certifications from the resume that closely matches with the job description.
3. **Missing skills**: A list of skills in the job description that are missing from the resume skills summary.
4. **Additional notes**: Without repeating any information in the report above, briefly list any other observations not covered already about the job being a good fit.`
        }
      ],
      max_tokens: 300,
      temperature: 0.2
    })
  });

  const responseBody = await response.text();

  console.group('OpenAI API Response for Job Skills Match Analysis');
  debugLog('Response Status:', response.status);
  debugLog('Response Headers:', Object.fromEntries(response.headers.entries()));
  debugLog('Response Body:', responseBody);
  console.groupEnd();

  if (!response.ok) {
    let errorMessage = 'Unknown API error occurred';
    try {
      const errorJson = JSON.parse(responseBody);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch (parseError) {
      handleError('Error parsing error response', parseError);
    }
    return handleError(`OpenAI API Error: ${errorMessage}`);
  }

  return responseBody;
}

async function matchResumeToJobDescription() {
  let jobDetails;
  try {
    jobDetails = await extractJobDetails();
  } catch (error) {
    return handleError('Could not extract job details', error);
  }

  try {
    loadingSpinner.style.display = 'block';

    const responseBody = await fetchMatchReport(jobDetails);

    const data = JSON.parse(responseBody);
    
    if (!(data.choices && data.choices[0] && data.choices[0].message)) {
      return handleError(`Invalid response: ${responseBody}`);
    }

    const matchResult = data.choices[0].message.content;
    document.getElementById('matchReportBox').style.display = 'block';
    document.getElementById('matchReportBox').innerHTML = "";

    const matchReport = document.createElement('div');
    matchReport.id = 'matchReport';
    matchReport.innerHTML = formatMatchReport(jobDetails.company, jobDetails.title, matchResult);
    document.getElementById('matchReportBox').appendChild(matchReport);
    
    const matchReportHTML = getStyleTagForInjection()
      + document.getElementById('matchReportBox').outerHTML;

    injectMatchReportIntoActiveTab(matchReportHTML);
    
    return matchResult;
  } catch (error) {
    return handleError("Resume match error", error);
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

function formatMatchReport(company, jobTitle, matchResult) {
  const matchResultMD = matchResult.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  return `
    <div class="h3"><img src="${chrome.runtime.getURL('images/icon16.png')}">&nbsp;
    Job Skills Match Report</div>${company || 'Unknown Company'}<br>
    <em>${jobTitle || ""}</em><div class="pre">${matchResultMD}</div>
  `;
}

function getStyleTagForInjection() {
  return `<style>
    .pre { column-count: 2; margin: 1em 0 0 0; font-size: 1.1em; white-space: pre-wrap; border-radius: 5px; overflow-y: auto; }
    .h3 { font-size: 1.26em; font-weight: bold; display: flex; align-items: center; }
    #matchReportBox { margin: 5px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background-color: #222; overflow-y: auto; display: none; }
  </style>`;
}

function injectMatchReportIntoActiveTab(matchReportHTML) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, 
      { action: 'injectMatchReport', matchReportHTML: matchReportHTML },
      (response) => {
        if (response?.success) {
          debugLog(response.message);
        } else {
          handleError(response?.message || 'Failed to send message');
        }
    });
  });
}

// matchBtn handler
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('matchBtn').addEventListener('click', matchResumeToJobDescription);
});
