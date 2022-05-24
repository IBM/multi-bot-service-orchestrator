/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { BotSession } from '@ibm-aca/session-store';

export enum EventType {
  REQUEST_RESPONSE = 'REQUEST_RESPONSE',
}

export type ConversationTurnData = {
  event: EventType.REQUEST_RESPONSE;
  timestamp: string | Date;
  log_id: string;
  data: {
    input: {
      text: string;
    };
    intents?: {
      intent: string;
      confidence: number;
    }[];
    entities?: {
      entity: string;
      value: string;
      location?: number[];
      confidence?: number;
    }[];
    output: {
      text: string[];
    };
    context: {
      conversation_id: string;
      skill_name: string;
      user_id: string;
      input_type: string;
      dialog_turn_counter: number;
      flow_information?: {
        id: string;
        display_name: string;
        state: string;
      };
      response_context?: {
        [key: string]: any;
      };
      // static_dimension_information?: {};
      // dimension_information?: [];
    };
  };
};

export type LogResult = { operation: string; row_count: number; ok: boolean };

export abstract class ConversationLogger {
  transform({ turn, activeBotName, conversationId, turnContext, botContext, userProfile }: BotSession): ConversationTurnData {
    return {
      event: EventType.REQUEST_RESPONSE,
      timestamp: turnContext.timestamp,
      log_id: turnContext.id,
      data: {
        input: {
          text: turnContext.input.text,
        },
        intents: turnContext.intents,
        entities: turnContext.entities,
        output: {
          text: turnContext.output.text,
        },
        context: {
          conversation_id: conversationId,

          skill_name: `${activeBotName}/${turnContext.skillName}`,
          user_id: userProfile.id,
          input_type: turnContext.input.type,
          dialog_turn_counter: turn,
          response_context: botContext,
        },
      },
    };
  }

  abstract init(): Promise<void>;

  abstract push(data: ConversationTurnData): Promise<LogResult>;
}
