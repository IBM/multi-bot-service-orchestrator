/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { AppConfig } from '@ibm-aca/common-config';
import logger from '@ibm-aca/common-logger';
import { OrchestratorResponse } from '@ibm-aca/multi-bot-orchestrator/types';
import { BotSession } from '@ibm-aca/session-store';
import AssistantV2, { RuntimeEntity, RuntimeIntent } from 'ibm-watson/assistant/v2';
import { IamAuthenticator } from 'ibm-watson/auth';
import R from 'ramda';

import { NLUService, NLUServiceResponse } from './types';

export class WatsonAssistantService implements NLUService {
  private defaultTopClass = 'DEFAULT';
  private config: AppConfig;
  private assistant: AssistantV2;
  constructor(config: AppConfig) {
    this.config = config;
    this.assistant = new AssistantV2({
      version: this.config.WATSON_ASSISTANT_VERSION,
      authenticator: new IamAuthenticator({
        apikey: this.config.WATSON_ASSISTANT_API_KEY,
      }),
      serviceUrl: this.config.WATSON_ASSISTANT_SERVICE_URL,
    });
  }

  formatResponse(response: any): OrchestratorResponse {
    let options;
    if (response.options) options = response.options.map((option: any) => ({ label: option.label, value: option.value.input.text }));
    return {
      type: response.response_type,
      text: response.text,
      title: response.title,
      description: response.description,
      options: options,
    };
  }

  async sendMessage(text: string, session: BotSession): Promise<NLUServiceResponse> {
    try {
      const waResponse = await this.assistant.messageStateless({
        assistantId: this.config.WATSON_ASSISTANT_ID,
        input: {
          message_type: 'text',
          text: text,
        },
        userId: this.config.WATSON_ASSISTANT_USER_ID,
        context: session.botContext['NLU'],
      });

      session.botContext['NLU'] = waResponse.result.context;

      logger.debug('[NLU] WA Response output', waResponse.result.output);
      const intents: RuntimeIntent[] = R.pathOr([], ['result', 'output', 'intents'], waResponse);
      const entities: RuntimeEntity[] = R.pathOr([], ['result', 'output', 'entities'], waResponse);
      const topIntent: RuntimeIntent = intents[0];

      const skillTransfer: string = R.pathOr(
        topIntent ? topIntent.intent : 'DEFAULT',
        ['result', 'context', 'skills', 'main skill', 'user_defined', 'skill_transfer'],
        waResponse
      );
      const responses = R.pathOr([], ['result', 'output', 'generic'], waResponse);

      return {
        text,
        skillTransfer,
        top_class: R.pathOr(this.defaultTopClass, ['intent'], topIntent),
        classes: intents.map((intent) => ({
          class_name: intent.intent,
          confidence: intent.confidence,
        })),
        entities: entities.map((entity) => ({
          entity: entity.entity,
          location: entity.location,
          value: entity.value,
          confidence: entity.confidence,
        })),
        response: responses.map((response) => this.formatResponse(response)),
      };
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
