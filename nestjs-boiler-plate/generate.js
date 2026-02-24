#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Helper function to convert camelCase to kebab-case
function camelToKebab(str) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

// Helper function to convert camelCase to PascalCase
function camelToPascal(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper function to convert kebab-case to camelCase
function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

// Helper function to pluralize model names
function pluralize(name) {
  const lowerName = name.toLowerCase();
  // Basic pluralization rules
  if (lowerName.endsWith('y')) {
    return lowerName.slice(0, -1) + 'ies';
  } else if (lowerName.endsWith('s') || lowerName.endsWith('sh') || lowerName.endsWith('ch') || lowerName.endsWith('x') || lowerName.endsWith('z')) {
    return lowerName + 'es';
  } else {
    return lowerName + 's';
  }
}

// Helper functions
function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Helper function to get available services
function getAvailableServices() {
  const appsPath = path.join(__dirname, 'apps');
  if (!fs.existsSync(appsPath)) {
    return ['main-service']; // fallback to default
  }
  
  return fs.readdirSync(appsPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name.endsWith('-service'));
}

// Lấy tham số từ command line
const args = process.argv.slice(2);

if (args.length < 1) {
  const availableServices = getAvailableServices();
  console.log('Usage:');
  console.log('  Create module: node generate.js [--service=<service-name>] <module-name> <field1>:<type> <field2>:<type> ...');
  console.log('  Create service: node generate.js --create-service <service-name> [--port=<port>]');
  console.log('');
  console.log('Module Examples:');
  console.log('  node generate.js product name:string price:number description:string category:string');
  console.log('  node generate.js --service=upload-service file name:string size:number type:string');
  console.log('  node generate.js fncRole name:string permissions:string isActive:boolean');
  console.log('  node generate.js article title:string tags:arrayString scores:arrayNumber');
  console.log('  node generate.js order userId:objectId:User productId:objectId:Product quantity:number');
  console.log('');
  console.log('Service Examples:');
  console.log('  node generate.js --create-service notification-service');
  console.log('  node generate.js --create-service payment-service --port=3002');
  console.log('');
  console.log('Available services:');
  availableServices.forEach(service => {
    console.log(`  - ${service}${service === 'main-service' ? ' (default)' : ''}`);
  });
  console.log('');
  console.log('Supported types:');
  console.log('  - string: Regular string field');
  console.log('  - number: Numeric field');
  console.log('  - boolean: Boolean field');
  console.log('  - date: Date field');
  console.log('  - email: Email field with validation');
  console.log('  - arrayString: Array of strings (e.g., tags, categories)');
  console.log('  - arrayNumber: Array of numbers (e.g., scores, ratings)');
  console.log('  - objectId:ModelName: Reference to another model (e.g., userId:objectId:User)');
  console.log('');
  console.log('Note: Module names support camelCase (e.g., fncRole will create fnc-role folders)');
  process.exit(1);
}

// Check if this is a service creation request
if (args[0] === '--create-service') {
  if (args.length < 2) {
    console.error('❌ Service name is required');
    console.log('Usage: node generate.js --create-service <service-name> [--port=<port>]');
    process.exit(1);
  }
  
  const serviceName = args[1];
  let servicePort = 3001; // default port
  
  // Check for port parameter
  const portArg = args.find(arg => arg.startsWith('--port='));
  if (portArg) {
    servicePort = parseInt(portArg.replace('--port=', ''));
    if (isNaN(servicePort)) {
      console.error('❌ Invalid port number');
      process.exit(1);
    }
  }
  
  // Validate service name format
  if (!serviceName.endsWith('-service')) {
    console.error('❌ Service name must end with "-service"');
    console.error('Example: notification-service, payment-service');
    process.exit(1);
  }
  
  // Check if service already exists
  const existingServices = getAvailableServices();
  if (existingServices.includes(serviceName)) {
    console.error(`❌ Service "${serviceName}" already exists`);
    process.exit(1);
  }
  
  createNewService(serviceName, servicePort);
  process.exit(0);
}

// Parse service parameter and module name
let targetService = 'main-service'; // default service
let moduleNameIndex = 0;

// Check if first argument is a service flag
if (args[0] && args[0].startsWith('--service=')) {
  targetService = args[0].replace('--service=', '');
  moduleNameIndex = 1;
}

// Validate service exists
const availableServices = getAvailableServices();
if (!availableServices.includes(targetService)) {
  console.error(`❌ Invalid service: ${targetService}`);
  console.error(`Available services: ${availableServices.join(', ')}`);
  process.exit(1);
}

// Adjust args array to skip service parameter if present
const adjustedArgs = args.slice(moduleNameIndex);

if (adjustedArgs.length < 2) {
  console.log('❌ Insufficient arguments after service selection');
  console.log('For module creation, you need: <module-name> <field1>:<type> <field2>:<type> ...');
  process.exit(1);
}

const moduleName = adjustedArgs[0];
const moduleNameKebab = camelToKebab(moduleName); // For file/folder names: fnc-role
const moduleNameLower = moduleName.toLowerCase(); // For simple lowercase: fncrole
const moduleNameCamel = kebabToCamel(moduleNameKebab); // Ensure proper camelCase: fncRole
const moduleNameCapital = camelToPascal(moduleNameCamel); // For class names: FncRole

console.log(`🎯 Generating module for service: ${targetService}`);
console.log(`📦 Module name: ${moduleNameCapital}`);

// Parse các field từ arguments
const fields = [];

// Nếu chỉ có 2 args, có thể fields được passed như comma-separated
if (adjustedArgs.length === 2) {
  const fieldsString = adjustedArgs[1];
  const fieldPairs = fieldsString.split(',');
  for (const fieldPair of fieldPairs) {
    const parts = fieldPair.trim().split(':');
    const fieldName = parts[0];
    const fieldType = parts[1];
    const refModel = parts[2]; // Tên model để reference (chỉ dành cho objectId)
    
    if (!fieldName || !fieldType) {
      console.error(`Invalid field format: ${fieldPair}. Expected format: field:type or field:objectId:ModelName`);
      process.exit(1);
    }
    
    const field = { name: fieldName.trim(), type: fieldType.trim() };
    if (fieldType === 'objectId' && refModel) {
      field.ref = refModel.trim();
    }
    fields.push(field);
  }
} else {
  // Original logic for individual arguments
  for (let i = 1; i < adjustedArgs.length; i++) {
    const parts = adjustedArgs[i].split(':');
    const fieldName = parts[0];
    const fieldType = parts[1];
    const refModel = parts[2]; // Tên model để reference (chỉ dành cho objectId)
    
    if (!fieldName || !fieldType) {
      console.error(`Invalid field format: ${adjustedArgs[i]}. Expected format: field:type or field:objectId:ModelName`);
      process.exit(1);
    }
    
    const field = { name: fieldName, type: fieldType };
    if (fieldType === 'objectId' && refModel) {
      field.ref = refModel;
    }
    fields.push(field);
  }
}

// Mapping kiểu dữ liệu TypeScript sang MongoDB/Mongoose
const typeMapping = {
  'string': { mongoose: 'String', validator: 'IsNotEmpty', prop: 'string' },
  'number': { mongoose: 'Number', validator: 'IsNumber', prop: 'number' },
  'boolean': { mongoose: 'Boolean', validator: 'IsBoolean', prop: 'boolean' },
  'date': { mongoose: 'Date', validator: 'IsDateString', prop: 'Date' },
  'email': { mongoose: 'String', validator: 'IsEmail', prop: 'string' },
  'objectId': { mongoose: 'Schema.Types.ObjectId', validator: 'IsMongoId', prop: 'string' },
  'arrayString': { mongoose: '[String]', validator: 'IsArray', prop: 'string[]' },
  'arrayNumber': { mongoose: '[Number]', validator: 'IsArray', prop: 'number[]' }
};

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Created: ${filePath}`);
}

function readTemplate(templateName) {
  const templatePath = path.join(__dirname, 'templates', `${templateName}.txt`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }
  return fs.readFileSync(templatePath, 'utf8');
}

function replaceTemplateVariables(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

// Generate Entity
function generateEntity() {
  const template = readTemplate('entity');
  
  // Collect unique reference models
  const refModels = [...new Set(fields
    .filter(field => field.type === 'objectId' && field.ref)
    .map(field => field.ref))];
  
  const imports = refModels.length > 0 
    ? refModels.map(model => {
        const modelKebab = camelToKebab(model);
        // For cross-service references, we might need to adjust the path
        // For now, assume all references are within the same service structure
        return `import { ${model} } from '../../${pluralize(modelKebab)}/entities/${modelKebab}.entity';`;
      }).join('\n')
    : '';
  
  const classFields = fields.map(field => {
    const required = field.type !== 'date'; // date fields are usually optional
    const mongooseType = typeMapping[field.type]?.mongoose || 'String';
    
    if (field.type === 'objectId' && field.ref) {
      return `  @Prop({ type: MongooseSchema.Types.ObjectId, ref: '${field.ref}'${required ? ', required: true' : ''} })
  ${field.name}${required ? '!' : '?'}: ${field.ref};`;
    } else {
      return `  @Prop(${required ? '{ required: true }' : ''})
  ${field.name}${required ? '!' : '?'}: ${typeMapping[field.type]?.prop || 'string'};`;
    }
  }).join('\n\n');

  const variables = {
    MODULE_NAME_CAPITAL: moduleNameCapital,
    MODULE_NAME_CAMEL: moduleNameCamel,
    MODULE_NAME_KEBAB: moduleNameKebab,
    MODULE_NAME_LOWER: moduleNameLower,
    TARGET_SERVICE: targetService,
    FIELDS: classFields,
    REF_IMPORTS: imports
  };

  return replaceTemplateVariables(template, variables);
}

// Generate Create DTO
function generateCreateDto() {
  const template = readTemplate('create-dto');
  
  const validators = [...new Set(fields.map(field => typeMapping[field.type]?.validator).filter(Boolean))];
  
  // Ensure IsMongoId is included if we have objectId fields
  const hasObjectId = fields.some(field => field.type === 'objectId');
  if (hasObjectId && !validators.includes('IsMongoId')) {
    validators.push('IsMongoId');
  }
  
  const classFields = fields.map(field => {
    const validator = typeMapping[field.type]?.validator || 'IsNotEmpty';
    const isRequired = field.type !== 'date';
    const fieldType = field.type === 'objectId' ? 'string' : (typeMapping[field.type]?.prop || 'string');
    
    return `  ${isRequired ? `@${validator}()` : '@IsOptional()'}
  ${field.name}${isRequired ? '!' : '?'}: ${fieldType};`;
  }).join('\n\n');

  const variables = {
    MODULE_NAME_CAPITAL: moduleNameCapital,
    MODULE_NAME_CAMEL: moduleNameCamel,
    MODULE_NAME_KEBAB: moduleNameKebab,
    MODULE_NAME_LOWER: moduleNameLower,
    VALIDATORS: validators.length > 0 ? validators.join(', ') : 'IsNotEmpty',
    FIELDS: classFields
  };

  return replaceTemplateVariables(template, variables);
}

// Generate Update DTO
function generateUpdateDto() {
  const template = readTemplate('update-dto');
  
  const variables = {
    MODULE_NAME_CAPITAL: moduleNameCapital,
    MODULE_NAME_CAMEL: moduleNameCamel,
    MODULE_NAME_KEBAB: moduleNameKebab,
    MODULE_NAME_LOWER: moduleNameLower
  };

  return replaceTemplateVariables(template, variables);
}

// Generate Pagination DTO
function generatePaginationDto() {
  const template = readTemplate('pagination-dto');
  
  // Collect required validators
  const requiredValidators = new Set(['IsOptional', 'IsNumber', 'Min', 'Max', 'IsString']);
  
  // Tạo filter fields dựa trên các field của entity
  const filterFields = fields.map(field => {
    const fieldType = typeMapping[field.type];
    let decorators = [];
    let tsType = field.type === 'objectId' ? 'string' : (fieldType?.prop || 'string');
    
    decorators.push('@IsOptional()');
    
    // Thêm decorator phù hợp với type
    switch (field.type) {
      case 'boolean':
        decorators.push("@Transform(({ value }) => value === 'true')");
        decorators.push('@IsBoolean()');
        requiredValidators.add('IsBoolean');
        break;
      case 'number':
        decorators.push('@Type(() => Number)');
        decorators.push('@IsNumber()');
        requiredValidators.add('IsNumber');
        break;
      case 'date':
        decorators.push('@IsDateString()');
        requiredValidators.add('IsDateString');
        break;
      case 'email':
        decorators.push('@IsEmail()');
        requiredValidators.add('IsEmail');
        break;
      case 'objectId':
        decorators.push('@IsMongoId()');
        requiredValidators.add('IsMongoId');
        break;
      case 'arrayString':
        decorators.push('@IsArray()');
        decorators.push('@IsString({ each: true })');
        requiredValidators.add('IsArray');
        break;
      case 'arrayNumber':
        decorators.push('@IsArray()');
        decorators.push('@IsNumber({}, { each: true })');
        requiredValidators.add('IsArray');
        break;
      default:
        decorators.push('@IsString()');
    }
    
    const decoratorStr = decorators.map(d => `  ${d}`).join('\n');
    return `${decoratorStr}
  ${field.name}?: ${tsType};`;
  }).join('\n\n');

  // Tạo search fields cho các field string
  const stringFields = fields.filter(field => 
    field.type === 'string' || field.type === 'email'
  );
  
  const searchFields = stringFields.length > 0 
    ? stringFields.map(field => `  @IsOptional()
  @IsString()
  ${field.name}Search?: string;`).join('\n\n')
    : '  // No string fields available for search';

  const variables = {
    MODULE_NAME_CAPITAL: moduleNameCapital,
    MODULE_NAME_CAMEL: moduleNameCamel,
    MODULE_NAME_KEBAB: moduleNameKebab,
    MODULE_NAME_LOWER: moduleNameLower,
    VALIDATORS: Array.from(requiredValidators).sort().join(', '),
    FILTER_FIELDS: filterFields,
    SEARCH_FIELDS: searchFields
  };

  return replaceTemplateVariables(template, variables);
}

// Generate Pagination Interface
function generatePaginationInterface() {
  const template = readTemplate('pagination-interface');
  return template; // Không cần thay thế biến vì đây là generic interface
}

// Generate Repository
function generateRepository() {
  const template = readTemplate('repository');
  
  const variables = {
    MODULE_NAME_CAPITAL: moduleNameCapital,
    MODULE_NAME_CAMEL: moduleNameCamel,
    MODULE_NAME_KEBAB: moduleNameKebab,
    MODULE_NAME_LOWER: moduleNameLower
  };

  return replaceTemplateVariables(template, variables);
}

// Generate Service
function generateService() {
  const template = readTemplate('service');
  
  const variables = {
    MODULE_NAME_CAPITAL: moduleNameCapital,
    MODULE_NAME_CAMEL: moduleNameCamel,
    MODULE_NAME_KEBAB: moduleNameKebab,
    MODULE_NAME_LOWER: moduleNameLower
  };

  return replaceTemplateVariables(template, variables);
}

// Generate Controller
function generateController() {
  const template = readTemplate('controller');
  
  // Tạo filter keys - tất cả các field trừ những field dùng cho search
  const filterKeys = fields
    .filter(field => field.type !== 'string' && field.type !== 'email')
    .map(field => `'${field.name}'`)
    .join(', ');
  
  // Tạo search keys - chỉ các field string và email
  const searchKeys = fields
    .filter(field => field.type === 'string' || field.type === 'email')
    .map(field => `'${field.name}'`)
    .join(', ');
  
  // Collect populate fields (ObjectId references)
  const populateFields = fields
    .filter(field => field.type === 'objectId' && field.ref)
    .map(field => `'${field.name}'`)
    .join(', ');
  
  const variables = {
    MODULE_NAME_CAPITAL: moduleNameCapital,
    MODULE_NAME_CAMEL: moduleNameCamel,
    MODULE_NAME_KEBAB: moduleNameKebab,
    MODULE_NAME_LOWER: moduleNameLower,
    FILTER_KEYS: filterKeys,
    SEARCH_KEYS: searchKeys,
    POPULATE_FIELDS: populateFields
  };

  return replaceTemplateVariables(template, variables);
}

// Generate Module
function generateModule() {
  const template = readTemplate('module');
  
  const variables = {
    MODULE_NAME_CAPITAL: moduleNameCapital,
    MODULE_NAME_CAMEL: moduleNameCamel,
    MODULE_NAME_KEBAB: moduleNameKebab,
    MODULE_NAME_LOWER: moduleNameLower
  };

  return replaceTemplateVariables(template, variables);
}

// Generate Postman Collection
function generatePostmanCollection() {
  const template = readTemplate('postman-collection');
  
  // Tạo sample create body
  const sampleCreateBody = {};
  fields.forEach(field => {
    switch (field.type) {
      case 'string':
        sampleCreateBody[field.name] = `Sample ${field.name}`;
        break;
      case 'number':
        sampleCreateBody[field.name] = 100;
        break;
      case 'boolean':
        sampleCreateBody[field.name] = true;
        break;
      case 'date':
        sampleCreateBody[field.name] = new Date().toISOString();
        break;
      case 'email':
        sampleCreateBody[field.name] = 'test@example.com';
        break;
      case 'objectId':
        sampleCreateBody[field.name] = '507f1f77bcf86cd799439011'; // Sample ObjectId
        break;
      case 'arrayString':
        sampleCreateBody[field.name] = [`Sample ${field.name} 1`, `Sample ${field.name} 2`];
        break;
      case 'arrayNumber':
        sampleCreateBody[field.name] = [100, 200, 300];
        break;
      default:
        sampleCreateBody[field.name] = `Sample ${field.name}`;
    }
  });

  // Tạo sample update body (similar to create but with "Updated" prefix)
  const sampleUpdateBody = {};
  fields.forEach(field => {
    switch (field.type) {
      case 'string':
        sampleUpdateBody[field.name] = `Updated ${field.name}`;
        break;
      case 'number':
        sampleUpdateBody[field.name] = 150;
        break;
      case 'boolean':
        sampleUpdateBody[field.name] = true;
        break;
      case 'date':
        sampleUpdateBody[field.name] = new Date().toISOString();
        break;
      case 'email':
        sampleUpdateBody[field.name] = 'updated@example.com';
        break;
      case 'objectId':
        sampleUpdateBody[field.name] = '507f1f77bcf86cd799439012'; // Sample ObjectId
        break;
      case 'arrayString':
        sampleUpdateBody[field.name] = [`Updated ${field.name} 1`, `Updated ${field.name} 2`];
        break;
      case 'arrayNumber':
        sampleUpdateBody[field.name] = [150, 250, 350];
        break;
      default:
        sampleUpdateBody[field.name] = `Updated ${field.name}`;
    }
  });

  // Tạo filter parameters
  const filterFields = fields.filter(field => field.type !== 'string' && field.type !== 'email');
  const searchFields = fields.filter(field => field.type === 'string' || field.type === 'email');

  // Sample filter params
  const sampleFilterParams = filterFields.length > 0 
    ? '?' + filterFields.slice(0, 2).map(field => {
        let value;
        switch (field.type) {
          case 'number': value = '100'; break;
          case 'boolean': value = 'true'; break;
          case 'date': value = '2024-01-01'; break;
          case 'objectId': value = '507f1f77bcf86cd799439011'; break;
          case 'arrayString': value = 'tag1,tag2'; break;
          case 'arrayNumber': value = '100,200'; break;
          default: value = 'sample';
        }
        return `${field.name}=${value}`;
      }).join('&')
    : '';

  // Sample search params
  const sampleSearchParams = searchFields.length > 0 
    ? '?' + searchFields.slice(0, 2).map(field => `${field.name}=sample`).join('&')
    : '';

  // Combined params
  const combinedParams = (filterFields.slice(0, 1).concat(searchFields.slice(0, 1))).map(field => {
    let value;
    switch (field.type) {
      case 'number': value = '100'; break;
      case 'boolean': value = 'true'; break;
      case 'date': value = '2024-01-01'; break;
      case 'objectId': value = '507f1f77bcf86cd799439011'; break;
      case 'arrayString': value = 'tag1,tag2'; break;
      case 'arrayNumber': value = '100,200'; break;
      default: value = 'sample';
    }
    return `${field.name}=${value}`;
  }).join('&');

  // Query params arrays for requests (properly formatted)
  const filterQueryParams = filterFields.slice(0, 2).map(field => {
    let value;
    switch (field.type) {
      case 'number': value = '100'; break;
      case 'boolean': value = 'true'; break;
      case 'date': value = '2024-01-01'; break;
      case 'objectId': value = '507f1f77bcf86cd799439011'; break;
      case 'arrayString': value = 'tag1,tag2'; break;
      case 'arrayNumber': value = '100,200'; break;
      default: value = 'sample';
    }
    return {
      key: field.name,
      value: value,
      description: `Filter by ${field.name}`
    };
  });

  const searchQueryParams = searchFields.slice(0, 2).map(field => ({
    key: field.name,
    value: 'sample',
    description: `Search by ${field.name} (regex)`
  }));

  const combinedQueryParams = [...filterQueryParams, ...searchQueryParams, 
    { key: 'page', value: '1' },
    { key: 'limit', value: '10' }
  ];

  const variables = {
    MODULE_NAME_CAPITAL: moduleNameCapital,
    MODULE_NAME_CAMEL: moduleNameCamel,
    MODULE_NAME_KEBAB: moduleNameKebab,
    MODULE_NAME_LOWER: moduleNameLower,
    SAMPLE_CREATE_BODY: JSON.stringify(sampleCreateBody).replace(/"/g, '\\"'),
    SAMPLE_UPDATE_BODY: JSON.stringify(sampleUpdateBody).replace(/"/g, '\\"'),
    SAMPLE_FILTER_PARAMS: sampleFilterParams,
    SAMPLE_SEARCH_PARAMS: sampleSearchParams,
    COMBINED_PARAMS: combinedParams ? '?' + combinedParams : '',
    SAMPLE_POPULATE: searchFields[0]?.name || 'relatedField',
    FILTER_QUERY_PARAMS: JSON.stringify(filterQueryParams),
    SEARCH_QUERY_PARAMS: JSON.stringify([...searchQueryParams, 
      { key: 'page', value: '1' },
      { key: 'limit', value: '10' }
    ]),
    COMBINED_QUERY_PARAMS: JSON.stringify(combinedQueryParams)
  };

  return replaceTemplateVariables(template, variables);
}

// Create a new service
function createNewService(serviceName, port) {
  console.log(`🚀 Creating new microservice: ${serviceName}`);
  console.log(`🔌 Port: ${port}`);
  
  const servicePath = path.join(__dirname, 'apps', serviceName);
  const srcPath = path.join(servicePath, 'src');
  const serviceBaseName = serviceName.replace('-service', '');
  const serviceNameCamel = kebabToCamel(serviceBaseName);
  const serviceNameCapital = camelToPascal(serviceNameCamel);
  
  // Check if service directory already exists
  if (fs.existsSync(servicePath)) {
    console.error(`❌ Service directory already exists: ${servicePath}`);
    process.exit(1);
  }
  
  // Create service directory structure
  createDirectory(srcPath);
  createDirectory(path.join(srcPath, serviceBaseName));
  
  // Generate main.ts for microservice with Kafka
  const mainTsContent = `import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { KAFKA_CLIENT_CONFIG } from '@app/shared';

async function bootstrap() {
  // Tạo Kafka microservice cho ${serviceNameCapital} Service
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          ...KAFKA_CLIENT_CONFIG,
          clientId: '${serviceName}',
        },
        consumer: {
          groupId: '${serviceName}-consumer',
        },
      },
    },
  );

  // Khởi động microservice
  await app.listen();
  console.log('🚀 ${serviceNameCapital} Service is running as Kafka microservice');
  console.log('� Consumer Group: ${serviceName}-consumer');
  console.log('🔗 Client ID: ${serviceName}');
}
bootstrap();
`;
  
  // Generate app.module.ts for microservice
  const appModuleContent = `import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ${serviceNameCapital}Module } from './${serviceBaseName}/${serviceBaseName}.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ${serviceNameCapital}Module,
  ],
})
export class AppModule {}
`;
  
  // Generate service module
  const serviceModuleContent = `import { Module } from '@nestjs/common';
import { ${serviceNameCapital}Controller } from './${serviceBaseName}.controller';
import { ${serviceNameCapital}Service } from './${serviceBaseName}.service';

@Module({
  controllers: [${serviceNameCapital}Controller],
  providers: [${serviceNameCapital}Service],
  exports: [${serviceNameCapital}Service],
})
export class ${serviceNameCapital}Module {}
`;
  
  // Generate service controller
  const serviceControllerContent = `import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ${serviceNameCapital}Service } from './${serviceBaseName}.service';

@Controller()
export class ${serviceNameCapital}Controller {
  constructor(private readonly ${serviceNameCamel}Service: ${serviceNameCapital}Service) {}

  @MessagePattern('${serviceBaseName}.process')
  async process(@Payload() data: any) {
    console.log('📨 Received message for ${serviceBaseName}.process:', data);
    return this.${serviceNameCamel}Service.processData(data);
  }

  @MessagePattern('${serviceBaseName}.health')
  async healthCheck() {
    return {
      status: 'ok',
      service: '${serviceName}',
      timestamp: new Date().toISOString(),
    };
  }
}
`;
  
  // Generate service service
  const serviceServiceContent = `import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ${serviceNameCapital}Service {
  private readonly logger = new Logger(${serviceNameCapital}Service.name);

  async processData(data: any) {
    this.logger.log('🔄 Processing data in ${serviceNameCapital}Service:', data);
    
    // TODO: Implement your business logic here
    
    return {
      success: true,
      processedAt: new Date().toISOString(),
      data: data,
      service: '${serviceName}',
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      service: '${serviceName}',
      timestamp: new Date().toISOString(),
    };
  }
}
`;
  
  // Generate tsconfig.app.json
  const tsconfigContent = `{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "outDir": "../../dist/apps/${serviceName}"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
`;
  
  // Write files
  writeFile(path.join(srcPath, 'main.ts'), mainTsContent);
  writeFile(path.join(srcPath, 'app.module.ts'), appModuleContent);
  writeFile(path.join(srcPath, serviceBaseName, `${serviceBaseName}.module.ts`), serviceModuleContent);
  writeFile(path.join(srcPath, serviceBaseName, `${serviceBaseName}.controller.ts`), serviceControllerContent);
  writeFile(path.join(srcPath, serviceBaseName, `${serviceBaseName}.service.ts`), serviceServiceContent);
  writeFile(path.join(servicePath, 'tsconfig.app.json'), tsconfigContent);
  
  // Update nest-cli.json
  updateNestCliConfig(serviceName);
  
  // Update shared library with new service constants
  updateSharedLibrary(serviceName, serviceBaseName);
  
  console.log(`\n✅ Microservice '${serviceName}' created successfully!`);
  console.log(`\n📁 Service created in: ${servicePath}`);
  console.log(`\n🔧 Next steps:`);
  console.log(`   1. Update your docker-compose.yml to include the new microservice`);
  console.log(`   2. Add Kafka configuration in your environment variables`);
  console.log(`   3. Update main-service to communicate with this microservice`);
  console.log(`   4. Run: npm run start:dev ${serviceName}`);
  console.log(`\n📝 Microservice details:`);
  console.log(`   • Type: Kafka Microservice`);
  console.log(`   • Consumer Group: ${serviceName}-consumer`);
  console.log(`   • Client ID: ${serviceName}`);
  console.log(`   • Message Patterns:`);
  console.log(`     - ${serviceBaseName}.process`);
  console.log(`     - ${serviceBaseName}.health`);
  console.log(`\n📖 Usage example from main-service:`);
  console.log(`   this.clientProxy.send('${serviceBaseName}.process', { data: 'example' })`);
}

// Update nest-cli.json to include new service
function updateNestCliConfig(serviceName) {
  const nestCliPath = path.join(__dirname, 'nest-cli.json');
  
  if (!fs.existsSync(nestCliPath)) {
    console.log('⚠️  nest-cli.json not found, skipping configuration update');
    return;
  }
  
  try {
    const nestCliContent = fs.readFileSync(nestCliPath, 'utf8');
    const nestCliConfig = JSON.parse(nestCliContent);
    
    // Initialize projects if it doesn't exist
    if (!nestCliConfig.projects) {
      nestCliConfig.projects = {};
    }
    
    // Add new service configuration
    nestCliConfig.projects[serviceName] = {
      "type": "application",
      "root": `apps/${serviceName}`,
      "entryFile": "main",
      "sourceRoot": `apps/${serviceName}/src`,
      "compilerOptions": {
        "tsConfigPath": `apps/${serviceName}/tsconfig.app.json`
      }
    };
    
    // Write updated configuration
    fs.writeFileSync(nestCliPath, JSON.stringify(nestCliConfig, null, 2));
    console.log(`✅ Updated nest-cli.json with ${serviceName} configuration`);
    
  } catch (error) {
    console.log(`⚠️  Failed to update nest-cli.json: ${error.message}`);
  }
}

// Update shared library with new service constants
function updateSharedLibrary(serviceName, serviceBaseName) {
  const sharedConstantsPath = path.join(__dirname, 'libs', 'shared', 'src', 'constants');
  const sharedIndexPath = path.join(__dirname, 'libs', 'shared', 'src', 'index.ts');
  
  // Create constants directory if it doesn't exist
  createDirectory(sharedConstantsPath);
  
  // Create or update service constants file
  const serviceConstantsPath = path.join(sharedConstantsPath, `${serviceBaseName}.constants.ts`);
  const serviceConstantsContent = `// ${serviceName.toUpperCase()} Message Patterns
export const ${serviceBaseName.toUpperCase()}_PATTERNS = {
  PROCESS: '${serviceBaseName}.process',
  HEALTH: '${serviceBaseName}.health',
} as const;

export type ${camelToPascal(serviceBaseName)}Pattern = typeof ${serviceBaseName.toUpperCase()}_PATTERNS[keyof typeof ${serviceBaseName.toUpperCase()}_PATTERNS];
`;
  
  writeFile(serviceConstantsPath, serviceConstantsContent);
  
  // Update shared index.ts to export new constants
  try {
    let indexContent = '';
    if (fs.existsSync(sharedIndexPath)) {
      indexContent = fs.readFileSync(sharedIndexPath, 'utf8');
    }
    
    const newExport = `export * from './constants/${serviceBaseName}.constants';`;
    
    // Check if export already exists
    if (!indexContent.includes(newExport)) {
      indexContent += `\n${newExport}`;
      fs.writeFileSync(sharedIndexPath, indexContent);
      console.log(`✅ Updated shared library index.ts with ${serviceName} constants`);
    }
    
  } catch (error) {
    console.log(`⚠️  Failed to update shared library: ${error.message}`);
  }
}

function generateModuleFiles() {
  // Use kebab-case for folder names: fnc-roles
  // Generate in the selected service directory
  const basePath = path.join(__dirname, 'apps', targetService, 'src', moduleNameKebab + 's');
  const postmanPath = path.join(__dirname, 'postman');
  
  // Create directories
  createDirectory(basePath);
  createDirectory(path.join(basePath, 'controllers'));
  createDirectory(path.join(basePath, 'dto'));
  createDirectory(path.join(basePath, 'entities'));
  createDirectory(path.join(basePath, 'interfaces'));
  createDirectory(path.join(basePath, 'repositories'));
  createDirectory(path.join(basePath, 'services'));
  createDirectory(postmanPath);

  // Generate files - use kebab-case for file names
  writeFile(path.join(basePath, 'entities', `${moduleNameKebab}.entity.ts`), generateEntity());
  writeFile(path.join(basePath, 'dto', `create-${moduleNameKebab}.dto.ts`), generateCreateDto());
  writeFile(path.join(basePath, 'dto', `update-${moduleNameKebab}.dto.ts`), generateUpdateDto());
  writeFile(path.join(basePath, 'dto', `${moduleNameKebab}-pagination.dto.ts`), generatePaginationDto());
  writeFile(path.join(basePath, 'interfaces', 'pagination-result.interface.ts'), generatePaginationInterface());
  writeFile(path.join(basePath, 'repositories', `${moduleNameKebab}.repository.ts`), generateRepository());
  writeFile(path.join(basePath, 'services', `${moduleNameKebab}.service.ts`), generateService());
  writeFile(path.join(basePath, 'controllers', `${moduleNameKebab}.controller.ts`), generateController());
  writeFile(path.join(basePath, `${moduleNameKebab}s.module.ts`), generateModule());
  
  // Generate Postman collection with service prefix
  const postmanFileName = `${targetService}-${moduleNameKebab}-api-collection.json`;
  writeFile(path.join(postmanPath, postmanFileName), generatePostmanCollection());

  console.log(`\n✅ Module '${moduleNameCamel}' generated successfully for ${targetService}!`);
  console.log(`\n📁 Files created in: ${basePath}`);
  console.log(`📄 Postman collection created in: ${postmanPath}/${postmanFileName}`);
  console.log(`\n🔧 Don't forget to:`);
  console.log(`   1. Add ${moduleNameCapital}Module to your ${targetService} app.module.ts imports`);
  console.log(`   2. Install any missing dependencies if needed`);
  console.log(`   3. Update your database connection if using different collections`);
  console.log(`   4. Import the Postman collection for API testing`);
  console.log(`\n📄 New features:`);
  console.log(`   • Pagination support in GET /${moduleNameKebab}s endpoint`);
  console.log(`   • Dedicated GET /${moduleNameKebab}s/paginated endpoint`);
  console.log(`   • Search and sorting capabilities`);
  console.log(`   • Complete Postman collection for testing`);
}

// Run the generator
generateModuleFiles();
