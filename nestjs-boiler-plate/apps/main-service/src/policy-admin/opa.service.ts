import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface OpaPublishPayload {
  app: {
    permissions: Record<string, { resources: Array<{ path: string; methods: string[] }> }>;
    catalog: {
      modules: Array<{ code: string; name: string }>;
      actions: string[];
      resourceTemplates: Array<{ module: string; path: string; methods: string[] }>;
    };
  };
}

interface OpaPolicy {
  policy: string; // Rego policy rules
  data: OpaPublishPayload; // Policy data
}

interface OpaEvaluateInput {
  http: {
    method: string;
    path: string;
  };
  subject: {
    user_id: string;
    roles: string[];
    perms: string[];
    tenant_id?: string;
  };
}

@Injectable()
export class OpaService {
  private readonly opaClient: AxiosInstance;
  private readonly opaUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.opaUrl = this.configService.get<string>('OPA_URL', 'http://localhost:8181');
    this.opaClient = axios.create({
      baseURL: this.opaUrl,
      timeout: 10000,
    });
  }

  async publishApp(payload: OpaPublishPayload): Promise<void> {
    try {
      console.log('Publishing to OPA with payload:', JSON.stringify(payload, null, 2));
      
      // Check OPA health first
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        throw new Error('OPA server is not healthy');
      }
      console.log('✅ OPA server is healthy');
      
      // First, publish the data
      await this.opaClient.put('/v1/data/app', payload);
      console.log('✅ Data published successfully to OPA');
      
      // Load existing policy and merge with new policy
      const mergedPolicy = this.mergePolicies();
      console.log('✅ Policy merged successfully');
      
      // Write merged policy to local file
      try {
        const targetFile = path.join(process.cwd(), 'config', 'opa', 'authz.rego');
        this.writePolicyToFile(mergedPolicy, targetFile);
        console.log('✅ Policy written to file:', targetFile);
      } catch (fileError) {
        console.error('❌ Failed to write policy file:', fileError.message);
        throw fileError;
      }

      // Update data.json with current payload
      try {
        const dataFile = path.join(process.cwd(), 'config', 'opa', 'data.json');
        this.writeDataToFile(payload, dataFile);
        console.log('✅ Data written to file:', dataFile);
      } catch (dataError) {
        console.error('❌ Failed to write data file:', dataError.message);
        throw dataError;
      }


    } catch (error) {
      console.error('❌ Failed to publish to OPA:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        // If it's a policy compilation error, log the policy for debugging
        if (error.response.status === 400 && error.response.data?.errors) {
          console.error('Policy compilation errors:', error.response.data.errors);
          console.error('Merged policy:', this.mergePolicies());
        }
      }
      throw new HttpException(
        `Failed to publish to OPA: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private loadPolicyFromFile(): string {
    try {
      // Try to load from authz.rego first
      let policyPath = path.join(process.cwd(), 'config', 'opa', 'authz.rego');
      if (fs.existsSync(policyPath)) {
        const policyContent = fs.readFileSync(policyPath, 'utf8');
        return policyContent;
      }
      
      // If authz.rego doesn't exist, try policy.rego
      policyPath = path.join(process.cwd(), 'config', 'opa', 'policy.rego');
      if (fs.existsSync(policyPath)) {
        const policyContent = fs.readFileSync(policyPath, 'utf8');
        return policyContent;
      }
      
      throw new Error('No policy file found');
    } catch (error) {
      throw new Error(`Failed to load policy from file: ${error.message}`);
    }
  }

  private resolvePolicyId(): string {
    // Prefer the filename that exists locally, to mirror OPA id
    const authz = path.join(process.cwd(), 'config', 'opa', 'authz.rego');
    if (fs.existsSync(authz)) return 'authz.rego';
    const policy = path.join(process.cwd(), 'config', 'opa', 'policy.rego');
    if (fs.existsSync(policy)) return 'policy.rego';
    // Fallback custom id
    return 'policy-admin.rego';
  }

  private writePolicyToFile(content: string, filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, { encoding: 'utf8' });
  }

  private writeDataToFile(payload: OpaPublishPayload, filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Format the JSON with proper indentation
    const formattedJson = JSON.stringify(payload, null, 2);
    fs.writeFileSync(filePath, formattedJson, { encoding: 'utf8' });
    
    console.log('📊 Data file updated with:');
    console.log(`  - ${Object.keys(payload.app.permissions).length} permissions`);
    console.log(`  - ${payload.app.catalog.modules.length} modules`);
    console.log(`  - ${payload.app.catalog.resourceTemplates.length} resource templates`);
  }

  private mergePolicies(): string {
    try {
      console.log('🔄 === POLICY MERGE START ===');
      
      // Try to load existing policy from file
      let existingPolicy = '';
      try {
        existingPolicy = this.loadPolicyFromFile();
        console.log('📄 Loaded existing policy from file');
        console.log('📄 Existing policy content:');
        console.log('-'.repeat(40));
        console.log(existingPolicy);
        console.log('-'.repeat(40));
      } catch (fileError) {
        console.log('📄 No existing policy file found, starting fresh');
        existingPolicy = '';
      }
      
      // Generate new policy rules
      const newPolicyRules = this.generatePolicyRules();
      console.log('📝 Generated new policy rules');
      console.log('📝 New policy content:');
      console.log('-'.repeat(40));
      console.log(newPolicyRules);
      console.log('-'.repeat(40));
      
      // If no existing policy, just return the new policy
      if (!existingPolicy || existingPolicy.trim() === '') {
        console.log('ℹ️ No existing policy, using generated policy only');
        console.log('🔄 === POLICY MERGE END (GENERATED ONLY) ===');
        return newPolicyRules;
      }
      
      // Check if existing policy already contains our rules
      if (existingPolicy.includes('# Function to check if user has permission for the requested resource') || 
          existingPolicy.includes('allow_permission(payload, method, path) if {')) {
        console.log('ℹ️ Existing policy already contains RBAC rules, using existing policy');
        console.log('🔄 === POLICY MERGE END (EXISTING ONLY) ===');
        return existingPolicy;
      }
      
      // Merge policies: existing policy + new RBAC rules
      const mergedPolicy = `${existingPolicy}

# ========================================
# RBAC Policy Rules (Auto-generated)
# ========================================

${newPolicyRules}`;
      
      console.log('🔗 Merged existing policy with new RBAC rules');
      console.log('🔗 Final merged policy content:');
      console.log('='.repeat(80));
      console.log(mergedPolicy);
      console.log('='.repeat(80));
      console.log('🔄 === POLICY MERGE END (MERGED) ===');
      return mergedPolicy;
      
    } catch (error) {
      console.warn('❌ Failed to merge policies, using generated policy only:', error.message);
      return this.generatePolicyRules();
    }
  }

  private generatePolicyRules(): string {
    console.log('📝 === GENERATING POLICY RULES ===');
    
    const policy = `package envoy.authz

import future.keywords

# Function to check if user has permission for the requested resource
allow_permission(payload, method, path) if {
    # Get user permissions from Keycloak JWT payload
    # Permissions are in resource_access.{client_id}.roles
    client_id := payload.azp  # Get client ID from azp (authorized party)
    user_roles := payload.resource_access[client_id].roles
    
    # Check if any role grants access to this resource
    some role
    role = user_roles[_]
    
    # Get permission resources from app data using the same format
    resources := data.app.permissions[role].resources
    
    # Check if any resource matches the current request
    some resource
    resource = resources[_]
    
    # Check if path matches (simple string matching for now)
    resource.path == path
    
    # Check if method is allowed
    method_allowed(method, resource.methods)
}

# Helper function to check if method is allowed
method_allowed(method, allowed_methods) if {
    method == allowed_methods[_]
}`;
    
    console.log('📝 Generated policy rules:');
    console.log('-'.repeat(40));
    console.log(policy);
    console.log('-'.repeat(40));
    console.log('📝 === POLICY RULES GENERATED ===');
    
    return policy;
  }

  async evaluate(input: OpaEvaluateInput): Promise<boolean> {
    try {
      const response = await this.opaClient.post('/v1/data/envoy/authz/allow', { input });
      return response.data.result.allowed === true;
    } catch (error) {
      if (error.response?.status === 404) {
        // Policy not found, deny by default
        return false;
      }
      throw new HttpException(
        `Failed to evaluate OPA policy: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.opaClient.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getData(): Promise<any> {
    try {
      const response = await this.opaClient.get('/v1/data');
      return response.data;
    } catch (error) {
      throw new HttpException(
        `Failed to get OPA data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getPolicies(): Promise<any> {
    try {
      const response = await this.opaClient.get('/v1/policies');
      return response.data;
    } catch (error) {
      throw new HttpException(
        `Failed to get OPA policies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getCurrentPolicy(): Promise<string> {
    try {
      const policyId = this.resolvePolicyId();
      const response = await this.opaClient.get(`/v1/policies/${policyId}`);
      // OPA returns raw for JSON body policies and plain text for text/plain; normalize
      if (typeof response.data === 'string') return response.data;
      return response.data.raw || 'Policy content not found';
    } catch (error) {
      if (error.response?.status === 404) {
        return 'Policy not found';
      }
      throw new HttpException(
        `Failed to get current policy: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getMergedPolicy(): Promise<string> {
    return this.mergePolicies();
  }

  async debugPolicyContent(): Promise<{ existing: string; generated: string; merged: string }> {
    try {
      // Get existing policy
      let existingPolicy = '';
      try {
        existingPolicy = this.loadPolicyFromFile();
      } catch (error) {
        existingPolicy = 'No existing policy file found';
      }

      // Get generated policy
      const generatedPolicy = this.generatePolicyRules();

      // Get merged policy
      const mergedPolicy = this.mergePolicies();

      return {
        existing: existingPolicy,
        generated: generatedPolicy,
        merged: mergedPolicy
      };
    } catch (error) {
      throw new HttpException(
        `Failed to debug policy content: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async validatePolicy(policyRules: string): Promise<boolean> {
    try {
      console.log('🔍 === POLICY VALIDATION START ===');
      console.log('📄 Policy content to validate:');
      console.log('='.repeat(80));
      console.log(policyRules);
      console.log('='.repeat(80));
      
      // Check both packages if they exist
      const queries = [];
      
      if (policyRules.includes('package authz')) {
        queries.push('data.authz.allow');
        console.log('✅ Found package: authz');
      }
      
      if (policyRules.includes('package envoy.authz')) {
        queries.push('data.envoy.authz.allow');
        console.log('✅ Found package: envoy.authz');
      }
      
      if (policyRules.includes('package policy_admin')) {
        queries.push('data.policy_admin.allow');
        console.log('✅ Found package: policy_admin');
      }
      
      // If no packages found, return false
      if (queries.length === 0) {
        console.error('❌ No valid packages found in policy');
        return false;
      }
      
      console.log('🔍 Queries to validate:', queries);
      
      // Validate each package
      for (const query of queries) {
        console.log(`🔍 Validating query: ${query}`);
        
        const response = await this.opaClient.post('/v1/check', {
          query: query,
          modules: [{
            path: 'merged_policy.rego',
            raw: policyRules
          }]
        });
        
        console.log(`✅ Query ${query} validation response:`, JSON.stringify(response.data, null, 2));
        
        // If any compilation errors, the policy is invalid
        if (response.data.errors && response.data.errors.length > 0) {
          console.error('❌ Policy validation failed for query:', query);
          console.error('❌ Errors:', JSON.stringify(response.data.errors, null, 2));
          return false;
        }
      }
      
      console.log('✅ === POLICY VALIDATION SUCCESS ===');
      // If no compilation errors, the policy is valid
      return true;
    } catch (error) {
      console.error('❌ === POLICY VALIDATION ERROR ===');
      console.error('❌ Error details:', error.response?.data || error.message);
      console.error('❌ Full error:', error);
      return false;
    }
  }

  async testPolicy(input: OpaEvaluateInput): Promise<{ result: boolean; explanation?: string }> {
    try {
      const response = await this.opaClient.post('/v1/data/envoy/authz/allow', { input });
      return { result: response.data.result.allowed === true };
    } catch (error) {
      if (error.response?.status === 404) {
        return { result: false, explanation: 'Policy not found' };
      }
      return { result: false, explanation: error.message };
    }
  }

  async testPolicyDirectly(policyRules: string, input: OpaEvaluateInput): Promise<{ result: boolean; explanation?: string }> {
    try {
      const response = await this.opaClient.post('/v1/check', {
        query: 'data.envoy.authz.allow',
        input: input,
        modules: [{
          path: 'test_policy.rego',
          raw: policyRules
        }]
      });
      
      return { result: response.data.result.allowed === true };
    } catch (error) {
      return { result: false, explanation: error.response?.data?.errors?.[0]?.message || error.message };
    }
  }
}
