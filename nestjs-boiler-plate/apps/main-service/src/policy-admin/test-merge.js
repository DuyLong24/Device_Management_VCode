const { OpaService } = require('./opa.service');
const { ConfigService } = require('@nestjs/config');

async function testMerge() {
  try {
    console.log('Testing policy merge...');
    
    // Create a mock config service
    const configService = {
      get: (key, defaultValue) => {
        if (key === 'OPA_URL') return 'http://localhost:8181';
        return defaultValue;
      }
    };
    
    // Create OPA service
    const opaService = new OpaService(configService);
    
    // Test merge policies
    const mergedPolicy = opaService.mergePolicies();
    console.log('✅ Merged policy:');
    console.log(mergedPolicy);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMerge();


