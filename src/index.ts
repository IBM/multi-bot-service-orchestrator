/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { AzureQnABot } from '@ibm-aca/azure-qna-bot';
import config from '@ibm-aca/common-config';
import logger from '@ibm-aca/common-logger';
import { getConversationLogger } from '@ibm-aca/conversation-data-logger';
import { EchoBot } from '@ibm-aca/echo-bot';
import { MongoStore } from '@ibm-aca/mongo-store';
import Orchestrator from '@ibm-aca/multi-bot-orchestrator';
import { WatsonAssistantService } from '@ibm-aca/nlu-services';
import { BotSessionStore, MemoryStore, RedisStore } from '@ibm-aca/session-store';
import { ServiceNowBot } from '@ibm-aca/snow-bot';
import { WatsonAssistantBot } from '@ibm-aca/watson-assistant-bot';
import { TurnContext } from 'botbuilder';
import cluster from 'cluster';
import compression from 'compression';
import cors from 'cors';
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import nocache from 'nocache';
import { cpus } from 'os';

(async () => {
  const app = express();
  app.enable('strict routing');
  app.enable('trust proxy');

  app.use(cors());
  app.use(helmet({ frameguard: false, contentSecurityPolicy: true, xssFilter: true }));
  app.use(compression());
  app.use(nocache());
  app.use(rateLimit({ max: 0 }));

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.text());

  let sessionStore: BotSessionStore;
  logger.debug(`Configuration Parameters:\n${JSON.stringify(config)}`);
  if (config.BotSession.SESSION_TYPE === 'cache') {
    sessionStore = new RedisStore(config.BotSession);
  } else {
    sessionStore = new MemoryStore(config.BotSession);
  }
  await sessionStore.init();

  const orchestrator = new Orchestrator(config, sessionStore);

  const mongoStore = new MongoStore(config.MongoService);
  mongoStore.connect();
  const botConfigs = await mongoStore.findAll(config.BOT_CONFIG_COLLECTION_NAME, {});

  for (const botConfig of botConfigs) {
    if (!botConfig.type || !botConfig.name || !botConfig.tags || !botConfig.auth || !botConfig.enabled) continue;
    logger.info(`Enabling ${botConfig.type} Bot: ${botConfig.name}, Tags: ${botConfig.tags.toString()}`);
    let bot;
    switch (botConfig.type) {
      case 'ServiceNow':
        bot = new ServiceNowBot(botConfig.auth, botConfig.tags, botConfig.name);
        bot.init(app);
        orchestrator.addBot(bot);
        break;
      case 'WatsonAssistant':
        bot = new WatsonAssistantBot(botConfig.auth, botConfig.tags, botConfig.name);
        orchestrator.addBot(bot);
        break;
      case 'QnA':
        bot = new AzureQnABot(botConfig.auth, botConfig.tags, botConfig.name);
        await bot.init();
        orchestrator.addBot(bot);
        break;
      case 'Echo':
        orchestrator.addBot(new EchoBot());
        break;
      default:
        logger.error(`Can't enable bot '${botConfig.name}' of type: '${botConfig.type}'`);
        break;
    }
  }

  if (config.WATSON_ASSISTANT_NLU_ENABLED) {
    logger.info(`Enabling 'Watson Assistant' Natural Language Undersanding`);
    orchestrator.setNLUService(new WatsonAssistantService(config));
  }

  if (config.CONVERSATION_LOGGER_ENABLED) {
    const conversationLogger = getConversationLogger(config.acaConversationLogger);
    conversationLogger.init();
    orchestrator.setConversationLogger(conversationLogger);
  }

  orchestrator.init();

  app.post('/api/messages', async (req: Request, res: Response) => {
    await orchestrator.channelAdapter.process(req, res, (context: TurnContext) => orchestrator.run(context));
  });

  app.get('/status', (req: Request, res: Response) => {
    res.status(200).json({ status: 200 });
  });

  if ((cluster.isPrimary || cluster.isMaster) && process.env.NODE_ENV === 'production') {
    logger.info(`[APP][PRIMARY] ${process.pid} is running`);

    for (let i = 0; i < cpus().length; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker) => {
      logger.info(`[APP][WORKER] ${worker.process.pid} died`);
      cluster.fork();
    });
  } else {
    app.listen(config.PORT, () => {
      logger.info(`[APP][WORKER] ${process.pid} is running on port: ${config.PORT}`);
      logger.info(`[APP][WORKER] To connect to Bot Framework Emulator use: http://127.0.0.1:${config.PORT}/api/messages`);
      logger.info(`[APP][WORKER] Active routes:`);
      app._router.stack.forEach((routeObj: any) => {
        if (routeObj.route && routeObj.route.path) {
          logger.info(`[APP][WORKER] ${Object.keys(routeObj.route.methods)[0].toUpperCase()}\t${routeObj.route.path}`);
        }
      });
    });
  }
})();
