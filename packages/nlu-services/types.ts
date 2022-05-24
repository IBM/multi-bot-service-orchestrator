/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { OrchestratorResponse } from '@ibm-aca/multi-bot-orchestrator/types';
import { BotSession } from '@ibm-aca/session-store';

import { WatsonAssistantService } from '.';

export type NLUServiceResponse = {
  text: string;
  skillTransfer: string;
  top_class: string;
  classes: Array<{
    class_name: string;
    confidence: number;
  }>;
  entities: Array<{
    entity: string;
    location?: number[];
    value: string;
    confidence?: number;
  }>;
  response: OrchestratorResponse[];
};

interface SendMessage {
  (text: string, session: BotSession): Promise<NLUServiceResponse>;
}

export abstract class NLUService {
  abstract sendMessage: SendMessage;
}

export default WatsonAssistantService;
