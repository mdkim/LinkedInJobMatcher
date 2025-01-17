let OPENAI_API_KEY;
loadApiKey((apiKey) => {
  OPENAI_API_KEY = apiKey;
});
const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-3.5-turbo';

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
  document.getElementById('matchReport').style.display = 'block';
  document.getElementById('matchReport').innerHTML = `<p class="error">${message}.<br>Error: ${error.message}</p>`;
}

function extractJobDetails() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "extractJobDetails"}, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
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
  //console.log("Job Details: ", jobDetails);

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
1. **Match percentage**: A single percentage value without explanation.
2. **Skills matches**: A list of skills and certifications from the resume that closely matches with the job description.
3. **Missing skills**: A list of skills in the job description that are missing from the resume skills summary.
4. **Additional notes**: Without repeating any information in the report above, briefly list any other relevant information or observations not covered already.`
        }
      ],
      max_tokens: 300,
      temperature: 0.3
    })
  });

  const responseBody = await response.text();
/*
  console.group('OpenAI API Response for Resume Match Analysis');
  console.log('Response Status:', response.status);
  console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
  console.log('Response Body:', responseBody);
  console.groupEnd();
*/
  if (!response.ok) {
    let errorMessage = 'Unknown API error occurred';
    try {
      const errorJson = JSON.parse(responseBody);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch (parseError) {
      console.error('Error parsing error response:', parseError);
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

    const matchDiv = document.createElement('div');
    matchDiv.innerHTML = formatMatchReport(jobDetails.company, matchResult);
    document.getElementById('matchReport').innerHTML = matchDiv.innerHTML;
    document.getElementById('matchReport').style.display = 'block';
    
    return matchResult;
  } catch (error) {
    return handleError("Resume match error", error);
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

function formatMatchReport(company, matchResult) {
  const matchResultMD = matchResult.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  return `
    <div class="h3">Resume Match Report</div>${company || 'Unknown Company'}<div class="pre">${matchResultMD}</div>
  `;
}

// resumeMatchBtn handler
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('resumeMatchBtn').addEventListener('click', matchResumeToJobDescription);
});
