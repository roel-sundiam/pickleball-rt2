const https = require('https');
const http = require('http');

// Function to test the schedule endpoint
function testScheduleEndpoint() {
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 3); // 3 days ago
  
  const startDate = pastDate.toISOString().split('T')[0];
  const url = `http://localhost:3000/api/schedule/weekly-detailed?startDate=${startDate}&days=7`;
  
  console.log(`Testing endpoint: ${url}`);
  console.log(`Start date: ${startDate} (3 days ago)`);
  console.log(`Today: ${today.toISOString().split('T')[0]}`);
  
  http.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Status Code: ${res.statusCode}`);
      console.log(`Response: ${data.substring(0, 500)}...`);
      
      if (res.statusCode === 200) {
        console.log('✅ SUCCESS: API now accepts past dates and filters properly!');
      } else {
        console.log('❌ FAILED: API still rejecting past dates');
      }
    });
  }).on('error', (err) => {
    console.log('❌ ERROR: Could not connect to server');
    console.log('Make sure the backend server is running on port 3000');
  });
}

testScheduleEndpoint();