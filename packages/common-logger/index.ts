/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { TransformableInfo } from 'logform';
import R from 'ramda';
import { createLogger, format, transports } from 'winston';

const printFormatter = (info: TransformableInfo) => {
  const meta = R.isEmpty(info.metadata) ? '' : `: ${JSON.stringify(info.metadata, null, ' ')}`;
  return `${info.timestamp} [${info.level}] ${info.message} ${meta}`;
};

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : process.env.LOG_LEVEL,
  format: format.combine(
    format.colorize(),
    format.json(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    format.printf(printFormatter)
  ),
  transports: [new transports.Console()],
  exitOnError: false,
});

export default logger;
