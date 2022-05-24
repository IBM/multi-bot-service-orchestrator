/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { CONVERSATION_LOGGER_TYPE, ConversationLoggerConfig } from '@ibm-aca/common-config';

import { PostgresClient } from './lib/postgres-client';
import { RestClient } from './lib/rest-client';
import { ConversationLogger } from './types';

const getConversationLogger = (config: ConversationLoggerConfig): ConversationLogger => {
  switch (config.CONVERSATION_LOGGER_TYPE) {
    case CONVERSATION_LOGGER_TYPE.POSTGRES:
      return new PostgresClient(config.POSTGRES_LOGGER);
    case CONVERSATION_LOGGER_TYPE.REST_API:
      return new RestClient(config.REST_LOGGER);
  }
};

export { ConversationLogger } from './types';
export { getConversationLogger };
