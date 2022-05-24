/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { Knowledgebase, QnAMakerClient } from '@azure/cognitiveservices-qnamaker';
import { OperationsGetDetailsResponse, QnASearchResultList } from '@azure/cognitiveservices-qnamaker/esm/models';
import { QnAMakerRuntimeClient } from '@azure/cognitiveservices-qnamaker-runtime';
import { QnASearchResult } from '@azure/cognitiveservices-qnamaker-runtime/esm/models';
import { ApiKeyCredentials } from '@azure/ms-rest-js';
import { BotAdapter } from '@ibm-aca/bot-adapter';
import { AzureQnABotConfig } from '@ibm-aca/common-config';
import logger from '@ibm-aca/common-logger';
import { OrchestratorResponse } from '@ibm-aca/multi-bot-orchestrator/types';
import { BotSession } from '@ibm-aca/session-store';
import R from 'ramda';
import { Observable } from 'rxjs';

import defaultQnA from './default-qna-list';

export class AzureQnABot extends BotAdapter {
  private config: AzureQnABotConfig;
  private qnaMakerClient: QnAMakerClient;
  private knowledgeBaseClient: Knowledgebase;
  private runtimeClient: QnAMakerRuntimeClient;
  private kbID: string;

  constructor(config: AzureQnABotConfig, skills: string[], botName: string) {
    super();
    this.name = botName;
    this.skills = skills;
    this.config = config;
  }

  async startChat(id: string, session: BotSession): Promise<Observable<OrchestratorResponse>> {
    this.addNewConversation(id);
    this.getConversationById(id).setTurnContext(session.turnContext);
    return this.onMessage(id, session);
  }

  async endChat(id: string): Promise<void> {
    this.removeConversation(id);
  }

  async init(): Promise<void> {
    if (this.config.KNOWLEDGE_BASE_ID) {
      this.kbID = this.config.KNOWLEDGE_BASE_ID;
    } else {
      const qnaMakerCredentials = new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': this.config.SUBSCRIPTION_KEY } });
      this.qnaMakerClient = new QnAMakerClient(qnaMakerCredentials, this.config.AUTHORING_ENDPOINT);
      this.knowledgeBaseClient = new Knowledgebase(this.qnaMakerClient);
      this.kbID = await this.initDefaultKnowledgeBase();
    }

    const qnaRuntimeCredentials = new ApiKeyCredentials({
      // inHeader: { Authorization: `EndpointKey ${await this.getEndpointKeys()}` },
      inHeader: { Authorization: `EndpointKey ${this.config.QUERY_ENDPOINT_KEY}` },
    });
    this.runtimeClient = new QnAMakerRuntimeClient(qnaRuntimeCredentials, this.config.RUNTIME_ENDPOINT);
  }

  async onMessage(message: string, session: BotSession): Promise<Observable<OrchestratorResponse>> {
    const context = session.turnContext;
    const conversationId = context.activity.conversation.id;
    const conversation = this.getConversationById(conversationId);
    let replyText = ``;
    const qnaSearchResult: QnASearchResultList = await this.runtimeClient.runtime.generateAnswer(this.kbID, {
      question: message,
      top: 1,
    });
    logger.debug('[AzureQnABot] QnA search result', qnaSearchResult);
    const topAnswer: QnASearchResult | undefined = qnaSearchResult?.answers?.[0];
    if (topAnswer) {
      replyText += topAnswer?.answer;
      // QnA Maker response score is the number in the range [0, 100]
      if (topAnswer.score && topAnswer.score < this.config.CONFIDENCE_THRESHOLD * 100) {
        conversation.setLowConfidence(true);
      }
      // Set turnContext properties
      const intents: { intent: string; confidence: number }[] = R.pathOr([], ['answers', 'questions'], qnaSearchResult);
      const entities: { entity: string; value: string; location?: number[]; confidence?: number }[] = R.pathOr(
        [],
        ['answers', 'metadata'],
        qnaSearchResult
      );

      context.intents = intents;
      context.entities = entities;

      // Every QnA Maker query is end of flow
      conversation.setComplete(true);
    }
    setTimeout(() => {
      logger.info('[AzureQnABot] Reply:', { replyText });
      this.reply(conversationId, this.formatResponse(replyText));
    });
    conversation.setTurnContext(context);
    return Promise.resolve(this.getNewReplyStream(conversationId));
  }

  private async initDefaultKnowledgeBase(): Promise<string> {
    const kb_payload = {
      name: 'QnA Maker JavaScript SDK Quickstart',
      qnaList: defaultQnA,
    };
    const results = await this.knowledgeBaseClient.create(kb_payload);
    if (!results._response.status.toString().startsWith('2')) {
      logger.error(`[AzureQnABot] Create request failed - HTTP status ${results._response.status}`);
      return Promise.reject(new Error('[AzureQnABot] Create request failed'));
    }
    const operationResult = await this.wait_for_operation(this.qnaMakerClient, R.pathOr('', ['operationId'], results));
    if (
      !operationResult ||
      !operationResult.operationState ||
      !(operationResult.operationState = 'Succeeded') ||
      !operationResult.resourceLocation
    ) {
      logger.error(`[AzureQnABot] Create operation state failed - HTTP status ${R.path(['_response', 'status'], operationResult)}`);
      return Promise.reject(new Error('[AzureQnABot] Create operation state failed'));
    }
    // parse resourceLocation for KB ID
    this.kbID = operationResult.resourceLocation.replace('/knowledgebases/', '');
    logger.info(`[AzureQnABot] Created default Knowledge Base: ID=${this.kbID}`);
    return this.kbID;
  }

  private async wait_for_operation(qnaClient: QnAMakerClient, operation_id: string): Promise<OperationsGetDetailsResponse | undefined> {
    let state: string | undefined = 'NotStarted';
    let operationResult: OperationsGetDetailsResponse | undefined;
    while ('Running' === state || 'NotStarted' === state) {
      operationResult = await qnaClient.operations.getDetails(operation_id);
      state = operationResult.operationState;
      logger.info(`[AzureQnABot] Waiting for operation to be started. Operation state - ${state}`);
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
    }
    return operationResult;
  }

  private async getEndpointKeys(): Promise<string | undefined> {
    logger.info(`[AzureQnABot] Getting runtime endpoint keys...`);
    try {
      const runtimeKeysClient = await this.qnaMakerClient.endpointKeys;
      const results = await runtimeKeysClient.getKeys();
      if (!results._response.status.toString().startsWith('2')) {
        logger.error(`[AzureQnABot] GetEndpointKeys request failed - HTTP status ${results._response.status}`);
        return;
      }
      logger.info(
        `[AzureQnABot] GetEndpointKeys request succeeded - HTTP status ${results._response.status} - primary key ${results.primaryEndpointKey}`
      );
      return results.primaryEndpointKey;
    } catch (err) {
      logger.error('[AzureQnABot] GetEndpointKeys request error', err);
    }
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
