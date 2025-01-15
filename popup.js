// Hardcoded OpenAI API Key - REPLACE with your actual key
const OPENAI_API_KEY = '';

function fallbackResumeMatchAnalysis(jobDetails) {
  return `Fallback Resume Match Analysis: 
- Unable to perform detailed analysis
- Manual review recommended`;
}

// Global variable to store job details
let currentJobDetails = null;

// Function to extract job details from the current tab
function extractJobDetails() {
  return new Promise((resolve, reject) => {
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
  });
}

// Function to match resume against job description
async function matchResumeToJobDescription() {
  // First, extract job details silently
  try {
    currentJobDetails = await extractJobDetails();
  } catch (error) {
    console.error('Error extracting job details:', error);
    document.getElementById('jobDetails').innerHTML = `
      <p>Could not extract job details. Error: ${error.message}</p>
    `;
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system", 
            content: "You are a software engineering recruiter providing concise, bullet-pointed reports comparing a resume skills summary to a job description."
          },
          {
            role: "user",
            content: `Analyze this job description and provide a concise match report against a resume skills summary:

Job Description:
"""
${currentJobDetails.description}
"""

Resume Skills Summary:
- SKILLS: Java, Spring Boot, Python, PyTorch, Pandas, PHP, Node.js, Javascript, React, LitElement, jQuery, Git, CSS, HTML, MySQL, DynamoDB, Hive, HQL+, Airflow, Docker, Grails, Gradle, Groovy, Android SDK
- CERTIFICATION: Udacity Nanodegree - AI Programming with Python, Baeldung Certificate - Java Spring, AWS Certified Developer – Associate

Provide a **brief report** with the following:
1. **Overall Match Percentage**: A single percentage value without explanation.
2. **Strengths**: A list of skills and certifications from the resume that align with the job description.
3. **Potential Skill Gaps**: A list of skills missing from the resume compared to the job description.`
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    // Parse the response body
    const responseBody = await response.text();
    
    // Extensive error logging
    console.group('OpenAI API Response for Resume Match Analysis');
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response Body:', responseBody);
    console.groupEnd();
    
    // Check for specific error conditions
    if (!response.ok) {
      let errorMessage = 'Unknown API error occurred';
      try {
        const errorJson = JSON.parse(responseBody);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }

      // Specific handling for quota/billing issues
      if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
        console.error('OpenAI API Quota Error:', errorMessage);
        return fallbackResumeMatchAnalysis(currentJobDetails);
      }

      console.error('OpenAI API Error:', errorMessage);
      return fallbackResumeMatchAnalysis(currentJobDetails);
    }

    const data = JSON.parse(responseBody);
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const matchResult = data.choices[0].message.content;
      
      // Create and append match result
      const matchDiv = document.createElement('div');
      matchDiv.innerHTML = `<h3>Resume Match Report</h3><pre>${matchResult}</pre>`;
      document.getElementById('jobDetails').appendChild(matchDiv);
      
      return matchResult;
    } else {
      return fallbackResumeMatchAnalysis(currentJobDetails);
    }
  } catch (error) {
    console.error('Full Resume Match API Error:', error);
    return fallbackResumeMatchAnalysis(currentJobDetails);
  }
}

// Add event listener to the static Match Resume button
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('resumeMatchBtn').addEventListener('click', matchResumeToJobDescription);
});
