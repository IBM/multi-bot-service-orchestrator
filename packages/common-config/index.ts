/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import schema from './schema';

export type BotSessionConfig = {
  SESSION_TYPE: string;
  REDIS_HOST_NAME: string;
  REDIS_PORT: number;
  REDIS_ACCESS_KEY: string;
  REDIS_SSL_ENABLED: boolean;
};

export type MongoServiceConfig = {
  MONGO_URI: string;
  MONGO_DB: string;
  MONGO_SSL: boolean;
  MONGO_SSL_CERT_PATH: string;
};

export type AzureQnABotConfig = {
  SUBSCRIPTION_KEY: string;
  AUTHORING_ENDPOINT: string;
  KNOWLEDGE_BASE_ID: string;
  RUNTIME_ENDPOINT: string;
  QUERY_ENDPOINT_KEY: string;
  CONFIDENCE_THRESHOLD: number;
};

export type ServiceNowBotConfig = {
  SERVICE_URL: string;
  USER_NAME: string;
  USER_PASSWORD: string;
  API_TOKEN: string;
  CONFIDENCE_THRESHOLD: number;
};

export type WatsonAssistantBotConfig = {
  API_KEY: string;
  SERVICE_URL: string;
  VERSION: string;
  ASSISTANT_ID: string;
  BASE_LANGUAGE: string;
  CONFIDENCE_THRESHOLD: number;
};

export enum CONVERSATION_LOGGER_TYPE {
  REST_API = 'rest_api',
  POSTGRES = 'postgres',
}

export type ConversationLoggerRestConfig = {
  REST_URL: string;
  REST_API_TOKEN: string;
};

export type ConversationLoggerPostgresConfig = {
  TENANT_ID: string;
  TENANT_TIMEZONE: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_NAME: string;
  DB_SCHEMA: string;
  DB_TABLE: string;
  SSL?: {
    CERT_BASE64: string;
  };
  IDLE_TIMEOUT: number;
  CONNECTION_TIMEOUT: number;
  MAX_CONNECTIONS: number;
};

export type ConversationLoggerConfig = {
  CONVERSATION_LOGGER_TYPE: CONVERSATION_LOGGER_TYPE;
  REST_LOGGER: ConversationLoggerRestConfig;
  POSTGRES_LOGGER: ConversationLoggerPostgresConfig;
};

export type AppConfig = {
  PORT: string;
  BotSession: BotSessionConfig;
  CONVERSATION_LOGGER_ENABLED: boolean;
  acaConversationLogger: ConversationLoggerConfig;
  MICROSOFT_APP_ID: string;
  MICROSOFT_APP_PASSWORD: string;
  MICROSOFT_APP_TYPE: string;
  MICROSOFT_APP_TENANT_ID: string | undefined;
  CONFIDENCE_THRESHOLD: number;
  WATSON_ASSISTANT_NLU_ENABLED: string;
  WATSON_ASSISTANT_VERSION: string;
  WATSON_ASSISTANT_SERVICE_URL: string;
  WATSON_ASSISTANT_BASE_LANGUAGE: string;
  WATSON_ASSISTANT_API_KEY: string;
  WATSON_ASSISTANT_ID: string;
  WATSON_ASSISTANT_USER_ID: string;
  ECHO_BOT_ENABLED: string;
  AZURE_QnA_BOT_ENABLED: string;
  AZURE_QnA_BOT_SKILLS: string[];
  AzureQnABot: AzureQnABotConfig;
  SNOW_BOT_ENABLED: string;
  SNOW_BOT_SKILLS: string[];
  WATSON_ASSISTANT_BOT_ENABLED: string;
  WATSON_ASSISTANT_BOT_SKILLS: string[];
  ServiceNowBot: ServiceNowBotConfig;
  WatsonAssistantBot: WatsonAssistantBotConfig;
  MongoService: MongoServiceConfig;
  BOT_CONFIG_COLLECTION_NAME: string;
};

const envVariables = {
  // Application Level
  PORT: process.env.PORT,
  CONFIDENCE_THRESHOLD: process.env.CONFIDENCE_THRESHOLD,

  // Bot Session
  BotSession: {
    SESSION_TYPE: process.env.SESSION_TYPE,
    REDIS_HOST_NAME: process.env.REDIS_HOST_NAME,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_ACCESS_KEY: process.env.REDIS_ACCESS_KEY,
    REDIS_SSL_ENABLED: process.env.REDIS_SSL_ENABLED,
  },

  MongoService: {
    MONGO_URI: process.env.MONGO_URI,
    MONGO_DB: process.env.MONGO_DB,
    MONGO_SSL: process.env.MONGO_SSL,
    MONGO_SSL_CERT_PATH: process.env.MONGO_SSL_CERT_PATH,
  },
  BOT_CONFIG_COLLECTION_NAME: process.env.BOT_CONFIG_COLLECTION_NAME,
  // Microsoft Bot Service
  MICROSOFT_APP_ID: process.env.MICROSOFT_APP_ID,
  MICROSOFT_APP_PASSWORD: process.env.MICROSOFT_APP_PASSWORD,
  MICROSOFT_APP_TYPE: process.env.MICROSOFT_APP_TYPE,
  MICROSOFT_APP_TENANT_ID: process.env.MICROSOFT_APP_TENANT_ID,

  // Primary NLU: Watson Assistant
  WATSON_ASSISTANT_NLU_ENABLED: process.env.WATSON_ASSISTANT_NLU_ENABLED,
  WATSON_ASSISTANT_VERSION: process.env.WATSON_ASSISTANT_VERSION,
  WATSON_ASSISTANT_SERVICE_URL: process.env.WATSON_ASSISTANT_SERVICE_URL,
  WATSON_ASSISTANT_BASE_LANGUAGE: process.env.WATSON_ASSISTANT_BASE_LANGUAGE,
  WATSON_ASSISTANT_API_KEY: process.env.WATSON_ASSISTANT_API_KEY,
  WATSON_ASSISTANT_ID: process.env.WATSON_ASSISTANT_ID,
  WATSON_ASSISTANT_USER_ID: process.env.WATSON_ASSISTANT_USER_ID,

  // Echo bot
  ECHO_BOT_ENABLED: process.env.ECHO_BOT_ENABLED,

  // Azure QnA bot
  AZURE_QnA_BOT_ENABLED: process.env.AZURE_QnA_BOT_ENABLED,
  AZURE_QnA_BOT_SKILLS: process.env.AZURE_QnA_BOT_SKILLS && JSON.parse(process.env.AZURE_QnA_BOT_SKILLS),
  AzureQnABot: {
    SUBSCRIPTION_KEY: process.env.AZURE_QnA_BOT_SUBSCRIPTION_KEY,
    AUTHORING_ENDPOINT: process.env.AZURE_QnA_BOT_AUTHORING_ENDPOINT,
    KNOWLEDGE_BASE_ID: process.env.AZURE_QnA_BOT_KNOWLEDGE_BASE_ID,
    RUNTIME_ENDPOINT: process.env.AZURE_QnA_BOT_RUNTIME_ENDPOINT,
    QUERY_ENDPOINT_KEY: process.env.AZURE_QnA_BOT_QUERY_ENDPOINT_KEY,
    CONFIDENCE_THRESHOLD: process.env.AZURE_QnA_BOT_CONFIDENCE_THRESHOLD,
  },

  // ServiceNow Bot
  SNOW_BOT_ENABLED: process.env.SNOW_BOT_ENABLED,
  SNOW_BOT_SKILLS: process.env.SNOW_BOT_SKILLS && JSON.parse(process.env.SNOW_BOT_SKILLS),
  ServiceNowBot: {
    SERVICE_URL: process.env.SNOW_SERVICE_URL,
    USER_NAME: process.env.SNOW_USER_NAME,
    USER_PASSWORD: process.env.SNOW_USER_PASSWORD,
    API_TOKEN: process.env.SNOW_API_TOKEN,
  },

  // Watson Assistant Bot
  WATSON_ASSISTANT_BOT_ENABLED: process.env.WATSON_ASSISTANT_BOT_ENABLED,
  WATSON_ASSISTANT_BOT_SKILLS: process.env.WATSON_ASSISTANT_BOT_SKILLS && JSON.parse(process.env.WATSON_ASSISTANT_BOT_SKILLS),
  WatsonAssistantBot: {
    API_KEY: process.env.WATSON_ASSISTANT_BOT_API_KEY,
    SERVICE_URL: process.env.WATSON_ASSISTANT_BOT_SERVICE_URL,
    VERSION: process.env.WATSON_ASSISTANT_BOT_VERSION,
    ASSISTANT_ID: process.env.WATSON_ASSISTANT_BOT_ASSISTANT_ID,
    BASE_LANUGAGE: process.env.WATSON_ASSISTANT_BOT_BASE_LANGUAGE,
  },

  // Conversation logger
  CONVERSATION_LOGGER_ENABLED: process.env.CONVERSATION_LOGGER_ENABLED,
  acaConversationLogger: {
    CONVERSATION_LOGGER_TYPE: process.env.CONVERSATION_LOGGER_TYPE,
    REST_LOGGER: {
      REST_URL: process.env.CONVERSATION_LOGGER_REST_URL,
      REST_API_TOKEN: process.env.CONVERSATION_LOGGER_REST_API_TOKEN,
    },
    POSTGRES_LOGGER: {
      TENANT_ID: process.env.CONVERSATION_LOGGER_POSTGRES_TENANT_ID,
      TENANT_TIMEZONE: process.env.CONVERSATION_LOGGER_POSTGRES_TENANT_TIMEZONE,
      DB_USER: process.env.CONVERSATION_LOGGER_POSTGRES_DB_USER,
      DB_PASSWORD: process.env.CONVERSATION_LOGGER_POSTGRES_DB_PASSWORD,
      DB_HOST: process.env.CONVERSATION_LOGGER_POSTGRES_DB_HOST,
      DB_PORT: process.env.CONVERSATION_LOGGER_POSTGRES_DB_PORT,
      DB_NAME: process.env.CONVERSATION_LOGGER_POSTGRES_DB_NAME,
      DB_SCHEMA: process.env.CONVERSATION_LOGGER_POSTGRES_DB_SCHEMA,
      DB_TABLE: process.env.CONVERSATION_LOGGER_POSTGRES_DB_TABLE,
      SSL: {
        CERT_BASE64: process.env.CONVERSATION_LOGGER_POSTGRES_CERT_BASE64,
      },
      IDLE_TIMEOUT: process.env.CONVERSATION_LOGGER_POSTGRES_IDLE_TIMEOUT,
      CONNECTION_TIMEOUT: process.env.CONVERSATION_LOGGER_POSTGRES_CONNECTION_TIMEOUT,
      MAX_CONNECTIONS: process.env.CONVERSATION_LOGGER_POSTGRES_MAX_CONNECTIONS,
    },
  },
};

const result = schema.validate(envVariables);
if (result.error) {
  throw new Error(`Configuration validation failed: ${result.error}`);
}
const config: AppConfig = result.value;

export default config;
