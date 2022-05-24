/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { ConversationLoggerRestConfig } from '@ibm-aca/common-config';
import logger from '@ibm-aca/common-logger';
import axios from 'axios';

import { ConversationLogger, ConversationTurnData, LogResult } from '../types';

interface AxiosResponse {
  data: LogResult;
}

export class RestClient extends ConversationLogger {
  private config: ConversationLoggerRestConfig;
  constructor(config: ConversationLoggerRestConfig) {
    super();
    this.config = config;
  }

  async init(): Promise<void> {
    return Promise.resolve();
  }

  async push(data: ConversationTurnData): Promise<LogResult> {
    return new Promise((resolve, reject) => {
      axios
        .request<LogResult>({
          method: 'post',
          url: `${this.config.REST_URL}/api/v1/events`,
          data: data,
          transformResponse: (r: AxiosResponse) => r.data,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.REST_API_TOKEN}`,
          },
        })
        .then((response) => {
          resolve(response.data);
        })
        .catch((error: any) => {
          logger.error(error.message);
          return reject(error);
        });
    });
  }
}
