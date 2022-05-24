/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { BotAdapter } from '@ibm-aca/bot-adapter';
import { BotContext } from '@ibm-aca/bot-adapter';
import { WatsonAssistantBotConfig } from '@ibm-aca/common-config';
import logger from '@ibm-aca/common-logger';
import { OrchestratorResponse } from '@ibm-aca/multi-bot-orchestrator/types';
import { BotSession, ConversationTurnContext } from '@ibm-aca/session-store';
import AssistantV2, { MessageResponseStateless } from 'ibm-watson/assistant/v2';
import { IamAuthenticator } from 'ibm-watson/auth';
import R from 'ramda';
import { Observable } from 'rxjs';

export class WatsonAssistantBot extends BotAdapter {
  private config: WatsonAssistantBotConfig;
  private assistant: AssistantV2;
  private turnContext: BotContext;

  constructor(config: WatsonAssistantBotConfig, skills: string[], name: string) {
    super();
    this.name = name;
    this.skills = skills;
    this.config = config;

    this.assistant = new AssistantV2({
      version: this.config.VERSION,
      authenticator: new IamAuthenticator({
        apikey: this.config.API_KEY,
      }),
      serviceUrl: this.config.SERVICE_URL,
    });
  }

  async startChat(id: string, session: BotSession): Promise<Observable<OrchestratorResponse>> {
    // logger.debug(`[${this.name}] startChat turn context`, context);
    this.addNewConversation(id);
    return this.onMessage(session.turnContext.activity.text, session);
  }

  async endChat(id: string): Promise<void> {
    this.removeConversation(id);
  }

  async onMessage(message: string, session: BotSession): Promise<Observable<OrchestratorResponse>> {
    // logger.debug(`[${this.name}] onMessage turn context`, context);
    const context: ConversationTurnContext = session.turnContext;
    const conversationId = context.activity.conversation.id;
    const conversation = this.getConversationById(conversationId);

    try {
      const waResponse = await this.assistant.messageStateless({
        assistantId: this.config.ASSISTANT_ID,
        input: {
          message_type: 'text',
          text: message,
        },
        userId: context.activity.from.id,
        context: session.botContext[this.name],
      });

      session.botContext[this.name] = waResponse.result.context;
      const completed: boolean = R.pathOr(false, ['result', 'context', 'skills', 'main skill', 'user_defined', 'completed'], waResponse);
      const intents: { intent: string; confidence: number }[] = R.pathOr([], ['result', 'output', 'intents'], waResponse);
      const entities: { entity: string; value: string; location?: number[]; confidence?: number }[] = R.pathOr(
        [],
        ['result', 'output', 'entities'],
        waResponse
      );

      context.intents = intents;
      context.entities = entities;
      // If the dialogue was completed, set completed to true
      if (completed) {
        conversation.setComplete(true);
      }
      // If all intents have a low confidence, set lowConfidence to true
      if (intents.length > 0) {
        const lowConfidence = intents.every((intent) => intent.confidence < this.config.CONFIDENCE_THRESHOLD);
        conversation.setLowConfidence(lowConfidence);
      }

      const payload: MessageResponseStateless = waResponse.result!;
      logger.debug(`[${this.name}] Response output`, payload.output);
      const resposneObject = payload.output.generic ?? [];
      setTimeout(() => {
        logger.info(`[${this.name}] Reply`, payload.output.generic);

        this.reply(conversationId, this.formatResponse(resposneObject));
      });
      conversation.setTurnContext(context);
      return Promise.resolve(this.getNewReplyStream(conversationId));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  formatResponse(messages: any[]): OrchestratorResponse[] {
    return messages.map((message) => {
      let options;
      if (message.options) options = message.options.map((option: any) => ({ label: option.label, value: option.value.input.text }));
      return {
        type: message.response_type,
        text: `[${this.name}] ${message.text}`,
        title: `[${this.name}] ${message.title ?? message.text}`,
        description: message.description,
        options: options,
      };
    });
  }
}
