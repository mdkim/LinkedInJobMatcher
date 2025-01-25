let OPENAI_API_KEY;
loadApiKey((apiKey) => {
  OPENAI_API_KEY = apiKey;
});
const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = 'gpt-4o-mini';
//const API_URL = "https://api.deepinfra.com/v1/openai/chat/completions";
//const MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
const DEBUG = false;

const CHROME_CONNECTION_ERROR = "Could not establish connection. Receiving end does not exist.";

function debugLog(...args) {
  if (!DEBUG) return;
  console.log(...args);
}

function loadApiKey(callback) {
  let OPENAI_API_KEY;
  try {
    chrome.storage.local.get('OPENAI_API_KEY', (result) => {
      if (!result.OPENAI_API_KEY) {
        handleError("OpenAI API Key not found in local storage");
        return;
      }
      OPENAI_API_KEY = result.OPENAI_API_KEY;
      callback(OPENAI_API_KEY);
    });
  } catch (error) {
    handleError("Error accessing local storage", error);
  }
};

function handleError(message, error = new Error()) {
  const matchReportBox = document.getElementById('matchReportBox');

  console.error(message, error);
  matchReportBox.style.display = 'block';

  const div = document.createElement('div');
  div.innerHTML = `<p class="error">${message}<br>Error: ${error.message}</p>`;
  matchReportBox.appendChild(div);
}

function extractJobDetails(retries = 0) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, {action: "extractJobDetails"}, (response) => {
        if (chrome.runtime.lastError) {
          // this is a hacky way to retry, requires clicking "Match" twice
          // if extension is reloaded after active tab is loaded,
          // possibly because of async confusion on my part
          if (chrome.runtime.lastError.message === CHROME_CONNECTION_ERROR
            && retries < 2
          ) {
            injectContentScript(tabId);
            return extractJobDetails(++retries);
          } else {
            handleError("Runtime error", chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }
        }

        if (response && response.jobDetails) {
          resolve(response.jobDetails);
        } else {
          reject(new Error("No job details found"));
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
          content: "You are a software engineering recruiter providing concise, bullet-pointed reports comparing a Job Description to a Resume Skills Summary."
        },
        {
          role: "user",
          content: `Analyze the Job Description below and provide a concise match report against the Resume Skills Summary below.
First, prepare by extracting a list of all skills explicitly named in the Job Description.
Then compare this list to the skills and certifications in the Resume Skills Summary.
Use this pre-report analysis prepared above to generate the report below.

Provide a brief report with the following sections:
1. **Match percentage**: A single percentage value for skills match, without explanation.
2. **Skills matches**:
   - ONLY include matches from the pre-report analysis above in the "Skills matches" section!
   - List skills that are explicitly named in the Job Description that closely matches with the Resume Skills Summary.
3. **Missing skills**:
   - Exclude from the "Missing skills" section any skills that are present in the Resume Skills Summary!
   - List skills in the Job Description from the pre-report analysis above that are missing from the Resume Skills Summary.
4. **Additional notes**: Without repeating any information in the match report above, briefly list any other observations not covered already about the job being a good fit.

Job Description:
"""
${jobDetails.description}
"""

Resume Skills Summary:
"""
- SKILLS: Java, Spring Boot, Python, PyTorch, Pandas, PHP, Node.js, Javascript, React, REST API, LitElement, jQuery, Git, CSS, HTML, SQL, NoSQL, MySQL, DynamoDB, Hive, HQL+, Airflow, Docker, Grails, Gradle, Groovy, Android SDK
- CERTIFICATIONS: Udacity Nanodegree - AI Programming with Python, Baeldung Certificate - Java Spring, AWS Certified Developer - Associate, AWS Serverless - Badge
"""
`
        }
      ],
      max_tokens: 300,
      temperature: 0.3
    })
  });

  const responseBody = await response.text();

  console.group("OpenAI API Response for Job Skills Match Analysis");
  debugLog("Response Status:", response.status);
  debugLog("Response Headers:", Object.fromEntries(response.headers.entries()));
  debugLog("Response Body:", responseBody);
  console.groupEnd();

  if (!response.ok) {
    let errorMessage = "Unknown API error occurred";
    try {
      const errorJson = JSON.parse(responseBody);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch (parseError) {
      handleError("Error parsing error response", parseError);
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
    return handleError("Could not extract job details", error);
  }

  try {
    loadingSpinner.style.display = 'block';

    const responseBody = await fetchMatchReport(jobDetails);

    const data = JSON.parse(responseBody);
    if (!(data.choices && data.choices[0] && data.choices[0].message)) {
      return handleError(`Invalid response: ${responseBody}`);
    }

    const matchReportBox = document.getElementById('matchReportBox');
    const matchResult = data.choices[0].message.content;
    const matchReport = document.createElement('div');
    updateMatchReportBox(matchReportBox, matchResult, matchReport, jobDetails);

    if (['linkedin', 'x'].includes(jobDetails.type)) {
      const matchReportHTML = getStyleTagForInjection()
        + matchReportBox.outerHTML;
      injectMatchReportIntoActiveTab(matchReportHTML);
    }

    return matchResult;
  } catch (error) {
    return handleError("Resume match error", error);
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

function updateMatchReportBox(matchReportBox, matchResult, matchReport, jobDetails) {
  matchReportBox.style.transition = 'none';
  matchReportBox.style.display = 'none';
  matchReportBox.style.height = 0;
  matchReportBox.innerHTML = "";

  matchReport.id = 'matchReport';
  matchReport.innerHTML = formatMatchReport(jobDetails.company, jobDetails.title, matchResult);
  matchReportBox.appendChild(matchReport);

  // start animation
  setTimeout(() => {
    matchReportBox.style.transition = 'height 0.7s ease-out';
    matchReportBox.style.display = 'block';
    matchReportBox.style.height = matchReport.scrollHeight + 'px';
  }, 20);
}

function formatMatchReport(company, jobTitle, matchResult) {
  const matchResultMD = matchResult.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/^### Match Report\n\n/, '');
  return `
    <div class="h3"><img src="${chrome.runtime.getURL("images/icon16.png")}">&nbsp;
    Job Skills Match Report</div>${company || "Unknown Company"}<br>
    <em>${jobTitle || ""}</em><div class="pre">${matchResultMD}</div>
  `;
}

function getStyleTagForInjection() {
  return `<style>
    .pre { column-count: 2;
      margin: 1em 0 0 0; font-size: 1.1em; white-space: pre-wrap; border-radius: 5px; }
    .h3 { font-size: 1.26em; font-weight: bold; display: flex; align-items: center; }
    #matchReportBox { box-sizing: content-box; font-family: inherit;
      overflow: hidden; display: none; margin: 5px 0; padding: 10px;
      border: 1px solid #ddd; border-radius: 5px; background-color: #222; }
  </style>`;
}

function injectMatchReportIntoActiveTab(matchReportHTML) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {
        action: 'injectMatchReport', matchReportHTML: matchReportHTML
      },
      (response) => {
        if (response?.success) {
          debugLog(response.message);
        } else {
          handleError(response?.message || "Failed to send message");
        }
    });
  });
}

// matchBtn, closePoopupBtn handlers
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('closePopupBtn').addEventListener('click', () => {
    window.close();
  }),  
  document.getElementById('matchBtn').addEventListener('click', matchResumeToJobDescription);
});

function injectContentScript(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId }, files: ['content.js']
  }, () => {
    if (chrome.runtime.lastError) {
      handleError("Error injecting script:", chrome.runtime.lastError);
    } else {
      console.log("Content script injected");
    }
  });
}

// inject content script on active tab page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.active || changeInfo.status !== 'complete') {
    return;
  }
  injectContentScript(tabId);
});
