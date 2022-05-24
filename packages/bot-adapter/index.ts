/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { OrchestratorResponse } from '@ibm-aca/multi-bot-orchestrator/types';
import { BotSession, ConversationTurnContext } from '@ibm-aca/session-store';
import * as R from 'ramda';
import { Observable, Subject } from 'rxjs';
export interface BotContext {
  [key: string]: any;
}

export class BotConversation {
  id: string;
  replyStream: Subject<OrchestratorResponse>;
  private context: BotContext;
  private complete: boolean;
  private lowConfidence: boolean;
  private turnContext: ConversationTurnContext;

  constructor(id: string) {
    this.id = id;
    this.replyStream = new Subject();
    this.complete = false;
    this.lowConfidence = false;
  }

  setContext(value: BotContext) {
    this.context = value;
  }

  getContext(): BotContext {
    return this.context;
  }

  setTurnContext(value: ConversationTurnContext) {
    this.turnContext = value;
  }

  getTurnContext(): ConversationTurnContext {
    return this.turnContext;
  }

  setComplete(value: boolean) {
    this.complete = value;
  }

  getComplete(): boolean {
    return this.complete;
  }

  setLowConfidence(value: boolean) {
    this.lowConfidence = value;
  }

  getLowConfidence(): boolean {
    return this.lowConfidence;
  }
}

export abstract class BotAdapter {
  name: string;
  skills: string[];
  confidence: number;
  protected conversations: BotConversation[];

  constructor() {
    this.conversations = [];
  }

  /**
   * Implements custom adapter logic process incoming message event
   * @param message user utterance
   * @param context turn context
   * @return Observable which emits a reply eventually
   */

  abstract onMessage(message: string, session: BotSession): Promise<Observable<OrchestratorResponse>>;

  reply(conversationId: string, message: OrchestratorResponse | OrchestratorResponse[]): void {
    const conversation = this.conversations.find((item) => item.id === conversationId);
    if (conversation) {
      if (<OrchestratorResponse>message != undefined) {
        conversation.replyStream.next(<OrchestratorResponse>message);
        conversation.replyStream.complete();
      } else if (Array.isArray(message)) {
        message.forEach((message: OrchestratorResponse) => conversation.replyStream.next(message));
        conversation.replyStream.complete();
      }
    } else {
      throw new Error(`Cant reply to conversation id=${conversationId}. No such conversation`);
    }
  }

  /**
   * Implements custom chat session start with third-party VA. You should call .addNewConversation() at the very beginning
   * @param id Conversation id
   * @param context TurnContext
   * @return Observable which emits a reply eventually
   */

  abstract startChat(id: string, session: BotSession): Promise<Observable<OrchestratorResponse>>;

  /**
   * Implements custom chat session end handler. You should call .removeConversation() at the very end
   * @param id Conversation id
   */
  abstract endChat(id: string): Promise<void>;

  /**
   * Implements expected response for secondary bot. All messages should evaluate to OrchestratorResponse type
   * @param args Any number of params depending on specific bot implementation
   */
  abstract formatResponse(...args: any[]): OrchestratorResponse[];

  addNewConversation(id: string): void {
    const exists = !R.isNil(this.conversations.find((item) => item.id === id));
    if (exists) {
      throw new Error(`Can't start new conversation with id=${id}. It already exists!`);
    }
    this.conversations.push(new BotConversation(id));
  }

  removeConversation(id: string): void {
    const index = R.findIndex(R.propEq('id', id))(this.conversations);
    if (index > -1) {
      this.conversations = R.remove(index, 1, this.conversations);
    }
    throw new Error(`Can't end conversation id=${id}. No such conversation`);
  }

  getConversationById(id: string): BotConversation {
    const conversation = this.conversations.find((item) => item.id === id);
    if (conversation) {
      return conversation;
    }
    throw new Error(`Conversation id=${conversation} not found`);
  }

  getNewReplyStream(id: string): Subject<OrchestratorResponse> {
    const conversation = this.conversations.find((item) => item.id === id);
    if (conversation) {
      conversation.replyStream = new Subject();
      return conversation.replyStream;
    }
    throw new Error(`Can't create new reply stream for conversation id=${id}`);
  }
}
