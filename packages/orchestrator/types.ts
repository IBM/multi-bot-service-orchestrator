/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
export type OrchestratorResponse = {
  type: string;
  text?: string;
  title?: string;
  description?: string;
  options?: Array<{
    label: string;
    value: string;
  }>;
};
