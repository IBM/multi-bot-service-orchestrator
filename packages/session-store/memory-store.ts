/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { BotSessionConfig } from '@ibm-aca/common-config';
import logger from '@ibm-aca/common-logger';

import { BotSession, BotSessionStore } from './index';

export class MemoryStore implements BotSessionStore {
  private config: BotSessionConfig;
  private sessions: {
    [key: string]: BotSession;
  };
  constructor(config: BotSessionConfig) {
    this.config = config;
    this.sessions = {};
  }

  async init(): Promise<void> {
    logger.info('[APP] Initialized In-Memory Session Store');
    return Promise.resolve();
  }

  async setSession(key: string, value: BotSession): Promise<void> {
    this.sessions[key] = value;
    return Promise.resolve();
  }

  async getSession(key: string): Promise<BotSession> {
    return Promise.resolve(this.sessions[key]);
  }
}
