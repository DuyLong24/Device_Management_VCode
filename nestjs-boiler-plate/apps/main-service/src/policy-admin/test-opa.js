const axios = require('axios');

const OPA_URL = 'http://localhost:8181';

async function testOPA() {
  try {
    console.log('Testing OPA connection...');
    
    // Test health check
    const healthResponse = await axios.get(`${OPA_URL}/health`);
    console.log('✅ OPA Health:', healthResponse.data);
    
    // Test simple policy
    const simplePolicy = `package authz

default allow = false

allow { 
    input.http.method == "GET" 
}`;
    
    console.log('Testing policy upload...');
    console.log('Policy content:', simplePolicy);
    
    // Try different API endpoints
    try {
      const policyResponse = await axios.put(`${OPA_URL}/v1/policies/test`, {
        id: 'test',
        raw: simplePolicy
      });
      console.log('✅ Policy uploaded via policies API:', policyResponse.data);
    } catch (error) {
      console.log('❌ Policies API failed, trying bundles API...');
      try {
        const bundleResponse = await axios.put(`${OPA_URL}/v1/policies/test`, simplePolicy, {
          headers: {
            'Content-Type': 'text/plain'
          }
        });
        console.log('✅ Policy uploaded via bundles API:', bundleResponse.data);
          } catch (bundleError) {
      console.log('❌ Bundles API failed, trying data API...');
      const dataResponse = await axios.put(`${OPA_URL}/v1/data/authz`, {
        allow: true
      });
      console.log('✅ Data uploaded via data API:', dataResponse.data);
    }
  }
    
    // Test policy evaluation
    const evalResponse = await axios.post(`${OPA_URL}/v1/data/authz/allow`, {
      input: {
        http: {
          method: 'GET',
          path: '/test'
        }
      }
    });
    console.log('✅ Policy evaluation:', evalResponse.data);
    
  } catch (error) {
    console.error('❌ OPA test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testOPA();
