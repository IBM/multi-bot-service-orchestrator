/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { BotAdapter } from '@ibm-aca/bot-adapter';
import { OrchestratorResponse } from '@ibm-aca/multi-bot-orchestrator/types';
import { BotSession } from '@ibm-aca/session-store';
// import logger from '@ibm-aca/common-logger';
import { Observable } from 'rxjs';

export class EchoBot extends BotAdapter {
  constructor() {
    super();
    this.name = 'EchoBot';
    this.skills = ['DEFAULT'];
  }
  async startChat(id: string, session: BotSession): Promise<Observable<OrchestratorResponse>> {
    this.addNewConversation(id);
    const replyText = session.turnContext.activity.text;
    this.getConversationById(id).setComplete(true);
    setTimeout(() => this.reply(id, this.formatResponse(replyText)));
    return Promise.resolve(this.getNewReplyStream(id));
  }

  async endChat(id: string): Promise<void> {
    this.removeConversation(id);
  }

  async onMessage(message: string, session: BotSession): Promise<Observable<OrchestratorResponse>> {
    const conversationId = session.turnContext.activity.conversation.id;
    const replyText = `[${this.name}] ${message}`;
    // logger.debug('[EchoBot] context', context);
    setTimeout(() => this.reply(conversationId, this.formatResponse(replyText)));
    return Promise.resolve(this.getNewReplyStream(conversationId));
  }

  formatResponse(message: string): OrchestratorResponse[] {
    return [
      {
        type: 'text',
        text: `[${this.name}] ${message}`,
      },
    ];
  }
}
