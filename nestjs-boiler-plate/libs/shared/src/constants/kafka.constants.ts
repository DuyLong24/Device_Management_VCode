// Kafka topic constants
export const KAFKA_TOPICS = {
  FILE_UPLOAD: 'file.upload',
  FILE_UPLOAD_RESPONSE: 'file.upload.response',
  FILE_DELETE: 'file.delete',
  FILE_DELETE_RESPONSE: 'file.delete.response',
} as const;

// Kafka client configuration
export const KAFKA_CLIENT_CONFIG = {
  clientId: 'nestjs-microservices',
  brokers: ['localhost:9092'], // Có thể config từ env
  retry: {
    retries: 3,
    initialRetryTime: 100,
    maxRetryTime: 30000,
  },
};

// Service names
export const SERVICES = {
  UPLOAD_SERVICE: 'UPLOAD_SERVICE',
  MAIN_SERVICE: 'MAIN_SERVICE',
} as const;
