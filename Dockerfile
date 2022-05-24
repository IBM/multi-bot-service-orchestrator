##########################################################
#  © Copyright IBM Corporation 2022. All Rights Reserved.
#
#  SPDX-License-Identifier: EPL-2.0
###########################################################
FROM node:16-alpine as build
RUN apk update && apk upgrade

WORKDIR /usr/app
COPY . .

RUN yarn install
RUN yarn compile

CMD ["yarn", "start"]