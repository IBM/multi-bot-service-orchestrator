/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { BotSessionConfig } from '@ibm-aca/common-config';
import logger from '@ibm-aca/common-logger';
import { createClient, RedisClientOptions } from 'redis';

import { BotSession, BotSessionStore } from './index';

export class RedisStore implements BotSessionStore {
  private redisClient: any;
  private config: BotSessionConfig;
  constructor(config: BotSessionConfig) {
    this.config = config;
  }

  async init() {
    // let options: RedisClientOptions;
    // if (this.config.REDIS_SSL_ENABLED) {
    // rediss for TLS
    const options: RedisClientOptions = {
      url: `rediss://${this.config.REDIS_HOST_NAME}:${this.config.REDIS_PORT}`,
      password: this.config.REDIS_ACCESS_KEY,
    };
    // }
    this.redisClient = createClient(options);
    this.redisClient.on('error', (err: Error) => logger.error('Redis Client Error', err));
    await this.redisClient.connect();
    logger.info('[APP] Initialized Redis Session Store');
  }

  async setSession(key: string, value: BotSession) {
    return this.redisClient.set(key, JSON.stringify(value));
  }

  async getSession(key: string) {
    return JSON.parse(await this.redisClient.get(key));
  }
}
