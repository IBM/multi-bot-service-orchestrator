/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { BotAdapter, BotContext, BotConversation } from '@ibm-aca/bot-adapter';
import { ServiceNowBotConfig } from '@ibm-aca/common-config';
import logger from '@ibm-aca/common-logger';
import { OrchestratorResponse } from '@ibm-aca/multi-bot-orchestrator/types';
import { BotSession } from '@ibm-aca/session-store';
import axios from 'axios';
import { AxiosRequestConfig } from 'axios';
import dayjs from 'dayjs';
import { Express, Request } from 'express';
import * as R from 'ramda';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

enum ServiceNowActions {
  START_CONVERSATION = 'START_CONVERSATION',
  END_CONVERSATION = 'END_CONVERSATION',
  AGENT = 'AGENT',
}

export type ServiceNowPayload = {
  requestId: string;
  action?: ServiceNowActions;
  enterpriseId: string;
  clientSessionId: string;
  message: {
    text: string;
    typed: boolean;
  };
  userId: string;
  timestamp: number;
  timezone?: string;
  token: string;
  history?: Array<{
    displayName: string;
    isBotMessage: boolean;
    type: string;
    value: string;
  }>;
};

export type ServiceNowBotResponse = {
  requestId: string;
  clientSessionId: string;
  nowSessionId: string;
  userId: string;
  body: Array<{
    uiType: string;
    group: string;
    value: string;
    maskType: string;
  }>;
  completed: boolean;
  score: number;
};

export class ServiceNowBot extends BotAdapter {
  private config: ServiceNowBotConfig;

  constructor(config: ServiceNowBotConfig, skills: string[], botName: string) {
    super();
    this.name = botName;
    this.skills = skills;
    this.config = config;
  }
  async init(app: Express): Promise<void> {
    app.post('/bots/snow/response', (req: Request) => {
      const snowResponse: ServiceNowBotResponse = req.body;
      logger.debug('[SnowBot] response body', snowResponse);
      const conversationId = snowResponse.clientSessionId;
      const conversation = this.getConversationById(conversationId);
      // Set ServiceNow VA specific context
      conversation.setContext({
        nowSessionId: snowResponse.nowSessionId,
        userId: snowResponse.userId,
      });

      // If the dialogue was completed, set completed to true
      if (snowResponse.completed) {
        conversation.setComplete(true);
      }
      // If SNOW has low confidence it will return score: 0, otherwise score: 1
      if (snowResponse.score < this.config.CONFIDENCE_THRESHOLD) {
        conversation.setLowConfidence(true);
      }
      // Generate reply text
      const reply = this.formatResponse(snowResponse.body);

      if (!R.isEmpty(reply)) {
        logger.debug('[SnowBot] Reply:', reply);
        this.reply(conversationId, reply);
      }
    });
  }

  async startChat(id: string, session: BotSession): Promise<Observable<OrchestratorResponse>> {
    const exists = !R.isNil(this.conversations.find((item) => item.id === id));
    if (exists) {
      throw new Error(`Can't start new conversation with id=${id}. It already exists!`);
    }
    const context = session.turnContext;
    this.conversations.push(new BotConversation(id));
    // Init ServiceNow VA session
    const payload: ServiceNowPayload = {
      requestId: uuidv4(),
      action: ServiceNowActions.START_CONVERSATION,
      enterpriseId: 'ServiceNow',
      clientSessionId: id,
      message: {
        text: context.activity.text,
        typed: true,
      },
      userId: context.activity.from.id,
      timestamp: dayjs().unix(),
      timezone: context.activity.localTimezone,
      token: this.config.API_TOKEN,
      history: [
        {
          displayName: context.activity.from.name,
          isBotMessage: false,
          type: 'text',
          value: '',
        },
      ],
    };
    this.getConversationById(id).setTurnContext(context);
    this.sendRequest(payload);
    return Promise.resolve(this.getNewReplyStream(id));
  }

  async endChat(id: string): Promise<void> {
    const context: BotContext = this.getConversationById(id).getContext();
    const payload: ServiceNowPayload = {
      requestId: uuidv4(),
      enterpriseId: 'ServiceNow',
      clientSessionId: id,
      message: {
        text: '',
        typed: true,
      },
      userId: context.userId,
      timestamp: dayjs().unix(),
      token: this.config.API_TOKEN,
    };
    await this.sendRequest(payload);
    this.removeConversation(id);
  }

  async onMessage(message: string, session: BotSession): Promise<Observable<OrchestratorResponse>> {
    const context = session.turnContext;
    const conversationId = context.activity.conversation.id;
    const payload: ServiceNowPayload = {
      requestId: uuidv4(),
      enterpriseId: 'ServiceNow',
      clientSessionId: conversationId,
      message: {
        text: message,
        typed: true,
      },
      userId: context.activity.from.id,
      timestamp: dayjs().unix(),
      timezone: context.activity.localTimezone,
      token: this.config.API_TOKEN,
    };
    this.sendRequest(payload);
    return Promise.resolve(this.getNewReplyStream(conversationId));
  }

  private async sendRequest(payload: ServiceNowPayload): Promise<void> {
    const options: AxiosRequestConfig = {
      method: 'post',
      auth: {
        username: this.config.USER_NAME,
        password: this.config.USER_PASSWORD,
      },
      url: this.config.SERVICE_URL,
      data: payload,
    };
    logger.debug('[SnowBot] onMessage request', options);
    return axios(options)
      .then((response) => {
        logger.debug('[SnowBot] onMessage axios response data', response.data);
      })
      .catch((err) => {
        logger.error('[SnowBot] onMessage axios error', err);
      });
  }

  formatResponse(response: any[]): OrchestratorResponse[] {
    return response.map((message) => {
      if (message.uiType === 'OutputText') {
        return {
          type: 'text',
          text: `[${this.name}] ${message.value}`,
        };
      } else if (message.uiType === 'InputText') {
        return {
          type: 'text',
          text: `[${this.name}] ${message.label}`,
        };
      } else if (message.uiType === 'Picker') {
        return {
          type: 'option',
          title: `[${this.name}] ${message.label}`,
          options: message.options.map((button: any) => ({ label: button.label, value: button.value })),
        };
      } else {
        return {
          type: 'text',
          text: `[${this.name}] Couldn't handle message of type ${message.uiType}`,
        };
      }
    });
  }
}
