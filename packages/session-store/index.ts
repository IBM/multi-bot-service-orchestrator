/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { BotContext } from '@ibm-aca/bot-adapter';
import { Activity } from 'botbuilder';

export { MemoryStore } from './memory-store';
export { RedisStore } from './redis-store';

export type ConversationUserProfile = {
  id: string;
  firstName?: string;
  secondName?: string;
  lastName?: string;
  fullName?: string;
};

export type ConversationTurnContext = {
  id: string;
  activity: Activity;
  timestamp: string | Date; //Contains the date and time that the message was sent, in UTC, expressed in ISO-8601 format.
  skillName: string;
  input: {
    type: string;
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
  flow_information?: {
    id: string;
    display_name: string;
    state: string;
  };
};

export interface BotSession {
  conversationId: string;
  channelId: string;
  turn: number;
  userProfile: ConversationUserProfile;
  turnContext: ConversationTurnContext;
  isFlowCompleted: boolean;
  isLowConfidence: boolean;
  activeBotName: string;
  botContext: {
    [key: string]: BotContext;
  };
}

export abstract class BotSessionStore {
  abstract init(): Promise<void>;
  abstract setSession(key: string, value: BotSession): Promise<void>;
  abstract getSession(key: string): Promise<BotSession>;
}
