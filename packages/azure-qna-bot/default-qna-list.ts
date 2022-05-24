/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
const defaultQnAList = [
  {
    answer:
      'Yes, You can use our [REST APIs](https://docs.microsoft.com/rest/api/cognitiveservices/qnamaker/knowledgebase) to manage your knowledge base.',
    questions: ['How do I manage my knowledge base?'],
    metadata: [
      { name: 'Category', value: 'api' },
      { name: 'Language', value: 'REST' },
    ],
  },
  {
    answer:
      'Yes, You can use our JS SDK on NPM for [authoring](https://www.npmjs.com/package/@azure/cognitiveservices-qnamaker), [query runtime](https://www.npmjs.com/package/@azure/cognitiveservices-qnamaker-runtime), and [the reference docs](https://docs.microsoft.com/en-us/javascript/api/@azure/cognitiveservices-qnamaker/?view=azure-node-latest) to manage your knowledge base.',
    questions: ['How do I manage my knowledge base?'],
    metadata: [
      { name: 'Category', value: 'api' },
      { name: 'Language', value: 'JavaScript' },
    ],
  },
];

export default defaultQnAList;
