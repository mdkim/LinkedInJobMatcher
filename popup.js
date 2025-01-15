// Hardcoded OpenAI API Key - REPLACE with your actual key
const OPENAI_API_KEY = '';

function fallbackResumeMatchAnalysis(jobDetails) {
  return `Fallback Resume Match Analysis: 
- Unable to perform detailed analysis
- Manual review recommended`;
}

// Function to match resume against job description
async function matchResumeToJobDescription(jobDetails) {
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
            content: "You are a professional career coach comparing a resume to a job description."
          },
          {
            role: "user",
            content: `Analyze this job description and provide a detailed match report against a standard software engineering resume:

Job Description:
${jobDetails.description}

Resume Skills Summary:
- SKILLS: Java, Spring Boot, Python, PyTorch, Pandas, PHP, Node.js, Javascript, React, LitElement, jQuery, Git, CSS, HTML, MySQL, DynamoDB, Hive, HQL+, Airflow, Docker, Grails, Gradle, Groovy, Android SDK
- CERTIFICATION: Udacity Nanodegree - AI Programming with Python, Baeldung Certificate - Java Spring, AWS Certified Developer – Associate

Please provide:
1. Overall Match Percentage
2. Strengths (Where skills closely align)
3. Potential Skill Gaps
4. Recommendations for improvement`
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
        return fallbackResumeMatchAnalysis(jobDetails);
      }

      console.error('OpenAI API Error:', errorMessage);
      return fallbackResumeMatchAnalysis(jobDetails);
    }

    const data = JSON.parse(responseBody);
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      return fallbackResumeMatchAnalysis(jobDetails);
    }
  } catch (error) {
    console.error('Full Resume Match API Error:', error);
    return fallbackResumeMatchAnalysis(jobDetails);
  }
}

document.getElementById('extractBtn').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    // inject content script
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      files: ['content.js']
    }, () => {
      // send message after script injection
      chrome.tabs.sendMessage(tabs[0].id, {action: "extractJobDetails"}, async (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          document.getElementById('jobDetails').innerHTML = `
            <h3>Error</h3>
            <p>Could not extract job details. Error: ${chrome.runtime.lastError.message}</p>
          `;
          return;
        }

        if (response && response.jobDetails) {
          // Display job details
          document.getElementById('jobDetails').innerHTML = `
            <h3>Job Details:</h3>
            <pre>${JSON.stringify(response.jobDetails, null, 2)}</pre>
          `;

          // Add Resume Match Button
          const analysisContainer = document.createElement('div');
          
          // Resume Match Button
          const resumeMatchBtn = document.createElement('button');
          resumeMatchBtn.textContent = 'Match Resume';
          resumeMatchBtn.onclick = async () => {
            const matchResult = await matchResumeToJobDescription(response.jobDetails);
            const matchDiv = document.createElement('div');
            matchDiv.innerHTML = `
              <h3>Resume Match Report</h3>
              <pre>${matchResult}</pre>
            `;
            analysisContainer.appendChild(matchDiv);
          };
          analysisContainer.appendChild(resumeMatchBtn);

          // Append buttons to job details
          document.getElementById('jobDetails').appendChild(analysisContainer);
        } else {
          document.getElementById('jobDetails').innerHTML = 'No job details found.';
        }
      });
    });
  });
});
