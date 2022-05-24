/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { ConversationLoggerPostgresConfig } from '@ibm-aca/common-config';
import logger from '@ibm-aca/common-logger';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { Pool, PoolClient, PoolConfig } from 'pg';
import * as R from 'ramda';

import { ConversationLogger, ConversationTurnData, LogResult } from '../types';

export class PostgresClient extends ConversationLogger {
  private config: ConversationLoggerPostgresConfig;
  private pgPool: Pool;
  private client: PoolClient;
  constructor(config: ConversationLoggerPostgresConfig) {
    super();
    this.config = config;
    dayjs.extend(utc);
    dayjs.extend(timezone);
  }

  async init() {
    const pgConfig: PoolConfig = {
      connectionString: this.getPostgreUri(this.config),
      idleTimeoutMillis: this.config.IDLE_TIMEOUT,
      connectionTimeoutMillis: this.config.CONNECTION_TIMEOUT,
      max: this.config.MAX_CONNECTIONS,
    };
    if (this.config.SSL?.CERT_BASE64) {
      pgConfig.ssl = {
        ca: Buffer.from(this.config.SSL.CERT_BASE64, 'base64').toString(),
        rejectUnauthorized: true,
      };
    }
    this.pgPool = new Pool(pgConfig);
    this.pgPool.on('error', (err) => {
      logger.error('PostgreSQL connection error', err);
    });
    // verify connection
    try {
      this.client = await this.pgPool.connect();
      logger.info(`Initialized PostgreSQL client connection`);
    } catch (err) {
      logger.error(`Failed to initialized PostgreSQL client connection`, err);
      throw err;
    } finally {
      this.client.release();
    }
  }

  async push(data: ConversationTurnData): Promise<LogResult> {
    const PAYLOAD = {
      id: R.path(['log_id'], data),
      eventJson: data,
      epoch: dayjs(data.timestamp).valueOf(),
      logDate: dayjs(data.timestamp).tz(this.config.TENANT_TIMEZONE).format('YYYY-MM-DD'), // convert to tenant's timezone
      tenantId: R.path([], this.config.TENANT_ID),
      skill: R.path(['data', 'context', 'skill_name'], data),
      conversationId: R.path(['data', 'context', 'conversation_id'], data),
      deployment: R.pathOr('default', ['data', 'context', 'deployment'], data),
    };

    const text = `INSERT INTO ${this.config.DB_SCHEMA}.${this.config.DB_TABLE}(id, event_json, epoch, log_date, tenant_id, skill, conversation_id, deployment)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8)`;
    const values = [
      PAYLOAD.id,
      PAYLOAD.eventJson,
      PAYLOAD.epoch,
      PAYLOAD.logDate,
      PAYLOAD.tenantId,
      PAYLOAD.skill,
      PAYLOAD.conversationId,
      PAYLOAD.deployment,
    ];
    try {
      logger.debug('Pushing conversation data', data);
      const RESULT = await this.pgPool.query(text, values);
      return {
        operation: RESULT.command,
        row_count: RESULT.rowCount,
        ok: true,
      };
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }

  async close() {
    if (this.pgPool) {
      await this.pgPool.end();
      logger.info('Connection pool has been closed');
    }
  }

  private getPostgreUri({ DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME }: ConversationLoggerPostgresConfig, params?: string): string {
    if (DB_USER && DB_USER && DB_PASSWORD && DB_PORT && DB_NAME) {
      let uri = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
      if (params) {
        uri = `${uri}?${params}`;
      }
      return uri;
    } else {
      throw new Error('Missing postgreSQL URI details');
    }
  }
}
