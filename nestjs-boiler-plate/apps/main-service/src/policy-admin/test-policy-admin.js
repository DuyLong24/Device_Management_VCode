const axios = require('axios');

const OPA_URL = 'http://localhost:8181';

async function testPolicyAdmin() {
  try {
    console.log('Testing Policy Admin OPA integration...');
    
    // Test 1: Health check
    console.log('\n1. Testing OPA health...');
    const healthResponse = await axios.get(`${OPA_URL}/health`);
    console.log('✅ OPA Health:', healthResponse.data);
    
    // Test 2: Publish data
    console.log('\n2. Publishing test data...');
    const testData = {
      permissions: {
        "user:read": {
          resources: [
            {
              path: "users",
              methods: ["GET"]
            }
          ]
        },
        "user:write": {
          resources: [
            {
              path: "users",
              methods: ["POST", "PUT"]
            }
          ]
        }
      }
    };
    
    await axios.put(`${OPA_URL}/v1/data/app`, testData);
    console.log('✅ Test data published');
    
    // Test 3: Test policy evaluation
    console.log('\n3. Testing policy evaluation...');
    
    // Test case 1: User with correct permission
    const testCase1 = await axios.post(`${OPA_URL}/v1/data/policy_admin/allow`, {
      input: {
        http: {
          method: "GET",
          path: "users"
        },
        subject: {
          perms: ["user:read"]
        }
      }
    });
    console.log('✅ Test case 1 (user:read + GET /users):', testCase1.data.result);
    
    // Test case 2: User with wrong permission
    const testCase2 = await axios.post(`${OPA_URL}/v1/data/policy_admin/allow`, {
      input: {
        http: {
          method: "POST",
          path: "users"
        },
        subject: {
          perms: ["user:read"]
        }
      }
    });
    console.log('✅ Test case 2 (user:read + POST /users):', testCase2.data.result);
    
    // Test case 3: User with correct permission for POST
    const testCase3 = await axios.post(`${OPA_URL}/v1/data/policy_admin/allow`, {
      input: {
        http: {
          method: "POST",
          path: "users"
        },
        subject: {
          perms: ["user:write"]
        }
      }
    });
    console.log('✅ Test case 3 (user:write + POST /users):', testCase3.data.result);
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testPolicyAdmin();
