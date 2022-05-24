/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { BotAdapter, BotConversation } from '@ibm-aca/bot-adapter';
import { AppConfig } from '@ibm-aca/common-config';
import logger from '@ibm-aca/common-logger';
import { ConversationLogger } from '@ibm-aca/conversation-data-logger';
import { NLUService, NLUServiceResponse } from '@ibm-aca/nlu-services/types';
import { BotSession, BotSessionStore } from '@ibm-aca/session-store';
import {
  ActionTypes,
  Activity,
  ActivityHandler,
  CardAction,
  CardFactory,
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  createBotFrameworkAuthenticationFromConfiguration,
  MessageFactory,
  TurnContext,
} from 'botbuilder';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import R from 'ramda';
import { finalize, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { OrchestratorResponse } from './types';

export default class Orchestrator extends ActivityHandler {
  private config: AppConfig;
  private bots: Array<BotAdapter>;
  private nluService: NLUService;
  private sessionStore: BotSessionStore;
  private conversationLogger: ConversationLogger;

  channelAdapter: CloudAdapter;

  constructor(config: AppConfig, sessionStore: BotSessionStore) {
    super();
    this.config = config;
    this.sessionStore = sessionStore;
    this.channelAdapter = new CloudAdapter(
      createBotFrameworkAuthenticationFromConfiguration(
        null as any,
        new ConfigurationServiceClientCredentialFactory({
          MicrosoftAppId: this.config.MICROSOFT_APP_ID,
          MicrosoftAppPassword: this.config.MICROSOFT_APP_PASSWORD,
        })
      )
    );
    this.bots = [];
    dayjs.extend(utc);
  }

  formatResponseMessages(messages: OrchestratorResponse[]): Partial<Activity>[] {
    return messages.map((message) => {
      switch (message.type) {
        case 'text': {
          return { type: 'message', text: message.text };
        }
        case 'option': {
          if (!message.options) throw new Error(`Buttons parameter needs to be provided when selecting type: ${message.type}`);
          const formatedButtons: CardAction[] = message.options
            // ActionTypes.PostBack does not print message back for some reason
            .map((button) => <CardAction>{ type: ActionTypes.ImBack, title: button.label, value: button.value })
            .reverse();

          const card = CardFactory.heroCard(message.title || '', undefined, formatedButtons);

          // return MessageFactory.suggestedActions(formatedButtons, message.title);
          return MessageFactory.attachment(card);
        }
        default:
          return { type: 'message', text: `Bot does not have a handler for response of type ${message.type}` };
      }
    });
  }

  /** Register NLU Service instance */
  setNLUService(service: NLUService): Orchestrator {
    this.nluService = service;
    return this;
  }

  setConversationLogger(service: ConversationLogger): Orchestrator {
    this.conversationLogger = service;
    return this;
  }

  /** Register bot instance */
  addBot(bot: BotAdapter): Orchestrator {
    this.bots.push(bot);
    return this;
  }

  /** Returns bot instance if it contains the skill */
  getBotBySkill(skill: string): BotAdapter | undefined {
    return this.bots.find((bot) => R.includes(skill, bot.skills));
  }

  getBotByName(name: string): BotAdapter | undefined {
    return this.bots.find((bot) => bot.name === name);
  }

  initSession(conversationId: string, context: TurnContext, outputText: string): BotSession {
    // Init SOE chat session
    const session: BotSession = {
      conversationId: conversationId,
      channelId: context.activity.channelId,
      userProfile: {
        id: context.activity.from.id,
      },
      turn: 0,
      turnContext: {
        id: context.activity.id || uuidv4(),
        activity: context.activity,
        timestamp: context.activity.timestamp || dayjs().utc().toISOString(),
        skillName: '',
        input: {
          text: context.activity.text || '',
          type: 'text',
        },
        output: {
          text: [outputText],
        },
      },
      isFlowCompleted: false,
      isLowConfidence: false,
      activeBotName: '',
      botContext: {},
    };
    this.sessionStore.setSession(conversationId, session);
    return session;
  }

  isEmptyResponse({ response }: NLUServiceResponse): boolean {
    let isEmpty = false;
    if (response.length === 0) {
      isEmpty = true;
    } else {
      response.forEach((message) => {
        if (message.text?.length === 0) {
          isEmpty = true;
        }
      });
    }
    return isEmpty;
  }

  /** Initialize event handlers. This method should called last in the chain */
  init() {
    this.channelAdapter.onTurnError = async (context: TurnContext, error: Error) => {
      logger.error(error.message);
      // Send a message to the user
      await context.sendActivity('The bot encountered an error or bug.');
    };
    // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
    this.onMessage(async (context, next) => {
      const conversationId = context.activity.conversation.id;
      let inputText = context.activity.text;
      if (!inputText) {
        inputText = context.activity.value.input.text;
      }
      logger.debug('[SOE] onMessage', context);
      // -----------------------
      // *** INCOMING STACK ***
      // -----------------------
      // Get chat session by conversationID
      let session: BotSession = await this.sessionStore.getSession(conversationId);
      if (!session) {
        session = this.initSession(conversationId, context, 'Welcome back');
      }
      logger.debug('[SOE] Got BotSession', session);

      session.turn += 1;
      session.turnContext.activity = context.activity;
      session.turnContext.id = context.activity.id || uuidv4();
      session.turnContext.timestamp = context.activity.timestamp || dayjs().utc().toISOString();
      session.turnContext.input.text = inputText;
      session.turnContext.output.text = [];
      // Call Primary NLU (optionally)
      let bot: BotAdapter | undefined;
      let nluResponse: NLUServiceResponse;
      bot = this.getBotByName(session.activeBotName);
      if (this.nluService && (session.isFlowCompleted || session.isLowConfidence || bot === undefined)) {
        nluResponse = await this.nluService.sendMessage(inputText, session);
        logger.debug('[SOE] NLU Response', nluResponse);
        if (!this.isEmptyResponse(nluResponse)) {
          //send MR reply to user and add it to context
          nluResponse.response.forEach((message: OrchestratorResponse) => {
            if (message.text) {
              session.turnContext.output.text = session.turnContext.output.text.concat(message.text);
            } else if (message.title) {
              session.turnContext.output.text = session.turnContext.output.text.concat(message.title);
            }
          });
          const formattedResponse = this.formatResponseMessages(nluResponse.response).reverse();
          await context.sendActivities(formattedResponse);
        }
        if (nluResponse.skillTransfer) {
          bot = this.getBotBySkill(nluResponse.skillTransfer);
          session.turnContext.skillName = nluResponse.skillTransfer;
        } else {
          // End of turn. Send conversation turn data for analytics
          bot = undefined;
          if (this.config.CONVERSATION_LOGGER_ENABLED) {
            const conversationTurnData = this.conversationLogger.transform(session);
            this.conversationLogger.push(conversationTurnData);
          }
        }
      }
      // Send message to Secondary Bot
      if (bot) {
        let replyStream: Observable<OrchestratorResponse>;

        logger.debug(`[SOE] Sending message to ${bot.name} bot: "${inputText}"`);
        try {
          bot.getConversationById(conversationId);
          replyStream = await bot.onMessage(context.activity.text, session);
        } catch (err) {
          replyStream = await bot.startChat(conversationId, session);
        }
        await new Promise((resolve, reject) => {
          let messages: OrchestratorResponse[] = [];
          replyStream
            .pipe(
              finalize(async () => {
                const conversation: BotConversation | undefined = bot?.getConversationById(conversationId);
                if (conversation === undefined) throw new TypeError('[SOE] Conversation cannot be undefined');
                const botName: string = bot?.name ?? 'unknown';

                session.isLowConfidence = conversation.getLowConfidence() ?? false;
                session.isFlowCompleted = conversation.getComplete() ?? true;
                session.activeBotName = botName;
                session.botContext[botName] = conversation.getContext() ?? {};
                session.turnContext = conversation.getTurnContext();

                // Send secondary bot responses and add them to context
                messages.forEach((message: OrchestratorResponse) => {
                  if (message.text) {
                    session.turnContext.output.text = session.turnContext.output.text.concat(message.text);
                  } else if (message.title) {
                    session.turnContext.output.text = session.turnContext.output.text.concat(message.title);
                  }
                });
                const formattedResponse = this.formatResponseMessages(messages);

                // Stagger each message with await to enforce ordering
                for (let i = 0; i < formattedResponse.length; i++) await context.sendActivity(formattedResponse[i]);

                await this.sessionStore.setSession(conversationId, session);

                // Send conversation turn data for analytics
                if (this.config.CONVERSATION_LOGGER_ENABLED) {
                  const conversationTurnData = this.conversationLogger.transform(session);
                  this.conversationLogger.push(conversationTurnData);
                }
              })
            )
            .subscribe({
              next: (message) => {
                // -----------------------
                // *** OUTGOING STACK ***
                // -----------------------
                logger.debug(`[SOE] Response from ${bot?.name} bot:`, message);

                // append message response
                messages = messages.concat(message);
              },
              error: (error) => {
                reject(error);
              },
            });
        });
      } else {
        // Send fallback message back to User
        logger.debug('[SOE] No Bot was found to handle message event');
      }
      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const welcomeText = 'Hello and welcome!';
      logger.debug('[SOE] onMembersAdded', context);
      const membersAdded = context.activity.membersAdded || [];
      const conversationId = context.activity.conversation.id;
      for (const member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
        }
      }
      const session = this.initSession(conversationId, context, welcomeText);
      // Send conversation turn data for analytics
      if (this.config.CONVERSATION_LOGGER_ENABLED) {
        const conversationTurnData = this.conversationLogger.transform(session);
        this.conversationLogger.push(conversationTurnData);
      }
      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });
  }
}
