/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { timeZonesNames } from '@vvo/tzdb';
import Joi from 'joi';

const schema = Joi.object({
  // Application Level
  PORT: Joi.string().default('3978'),
  LOG_LEVEL: Joi.string(),

  // Bot Session
  BotSession: Joi.object({
    SESSION_TYPE: Joi.string().valid('memory', 'cache').default('memory'),
    REDIS_HOST_NAME: Joi.alternatives().conditional('SESSION_TYPE', { is: 'cache', then: Joi.string().required() }),
    REDIS_PORT: Joi.alternatives().conditional('SESSION_TYPE', { is: 'cache', then: Joi.number().required() }),
    REDIS_ACCESS_KEY: Joi.alternatives().conditional('SESSION_TYPE', { is: 'cache', then: Joi.string().required() }),
    REDIS_SSL_ENABLED: Joi.alternatives().conditional('SESSION_TYPE', { is: 'cache', then: Joi.boolean().required().default(false) }),
  }),

  MongoService: Joi.object({
    MONGO_URI: Joi.string().default(''),
    MONGO_DB: Joi.string().default(''),
    MONGO_SSL: Joi.string().default(false),
    MONGO_SSL_CERT_PATH: Joi.string().default(''),
  }),
  BOT_CONFIG_COLLECTION_NAME: Joi.string().default(''),

  // Microsoft Bot Service
  MICROSOFT_APP_ID: Joi.string().default(''),
  MICROSOFT_APP_PASSWORD: Joi.string().default(''),
  MICROSOFT_APP_TYPE: Joi.string().default('MultiTenant'),
  MICROSOFT_APP_TENANT_ID: Joi.string(),
  CONFIDENCE_THRESHOLD: Joi.number().default(0.7),

  // Primary NLU: Watson Assistant
  WATSON_ASSISTANT_NLU_ENABLED: Joi.boolean().default(false),
  WATSON_ASSISTANT_VERSION: Joi.string().default('2021-06-14'),
  WATSON_ASSISTANT_SERVICE_URL: Joi.string().default(''),
  WATSON_ASSISTANT_BASE_LANGUAGE: Joi.string().default('en'),
  WATSON_ASSISTANT_API_KEY: Joi.string().default(''),
  WATSON_ASSISTANT_ID: Joi.string().default(''),
  WATSON_ASSISTANT_USER_ID: Joi.string(),

  // Echo bot
  ECHO_BOT_ENABLED: Joi.boolean().default(false),

  // Azure QnA bot
  AZURE_QnA_BOT_ENABLED: Joi.boolean().default(false),
  AZURE_QnA_BOT_SKILLS: Joi.array().items(Joi.string()).default(['HR-FAQ']),
  AzureQnABot: Joi.object({
    SUBSCRIPTION_KEY: Joi.string().default(''),
    AUTHORING_ENDPOINT: Joi.string().default(''),
    KNOWLEDGE_BASE_ID: Joi.string().default(''),
    RUNTIME_ENDPOINT: Joi.string().default(''),
    QUERY_ENDPOINT_KEY: Joi.string().default(''),
    CONFIDENCE_THRESHOLD: Joi.number().default(1),
  }),

  // ServiceNow Bot
  SNOW_BOT_ENABLED: Joi.boolean().default(false),
  SNOW_BOT_SKILLS: Joi.array().items(Joi.string()).default(['IT-FAQ']),
  ServiceNowBot: {
    SERVICE_URL: Joi.string().default(''),
    USER_NAME: Joi.string().default(''),
    USER_PASSWORD: Joi.string().default(''),
    API_TOKEN: Joi.string().default(''),
    CONFIDENCE_THRESHOLD: Joi.number().default(1),
  },

  // Watson Assistant Bot
  WATSON_ASSISTANT_BOT_ENABLED: Joi.boolean().default(false),
  WATSON_ASSISTANT_BOT_SKILLS: Joi.array().items(Joi.string()).default(['WA-FAQ']),
  WatsonAssistantBot: {
    API_KEY: Joi.string().default(''),
    SERVICE_URL: Joi.string().default(''),
    VERSION: Joi.string().default('2021-06-14'),
    ASSISTANT_ID: Joi.string().default(''),
    BASE_LANUGAGE: Joi.string().default('en'),
    CONFIDENCE_THRESHOLD: Joi.number().default(0.5),
  },

  // Conversation Data Logger
  CONVERSATION_LOGGER_ENABLED: Joi.boolean().default(false),
  acaConversationLogger: Joi.object({
    CONVERSATION_LOGGER_TYPE: Joi.string().valid('rest_api', 'postgres').default('postgres'),
    REST_LOGGER: Joi.alternatives().conditional('CONVERSATION_LOGGER_TYPE', {
      is: 'rest_api',
      then: Joi.object({
        REST_URL: Joi.string().default(''),
        REST_API_TOKEN: Joi.string().default(''),
      }),
      otherwise: Joi.any(),
    }),
    POSTGRES_LOGGER: Joi.alternatives().conditional('CONVERSATION_LOGGER_TYPE', {
      is: 'postgres',
      then: Joi.object({
        TENANT_ID: Joi.string().required(),
        TENANT_TIMEZONE: Joi.string()
          .valid(...timeZonesNames)
          .required()
          .default('UTC'),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_NAME: Joi.string().required(),
        DB_SCHEMA: Joi.string().required().default('public'),
        DB_TABLE: Joi.string().required().default('raw_records'),
        SSL: Joi.alternatives().try(
          Joi.object({
            CERT_BASE64: Joi.string().optional(),
          }),
          Joi.boolean()
        ),
        IDLE_TIMEOUT: Joi.number().default(10000),
        CONNECTION_TIMEOUT: Joi.number().default(0),
        MAX_CONNECTIONS: Joi.number().default(10),
      }),
      otherwise: Joi.any(),
    }),
  }),
});

export default schema;
