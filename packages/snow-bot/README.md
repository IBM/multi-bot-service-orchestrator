<!--
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
-->
# ServiceNow Virutal Agent Bot Integration

ServiceNow allows for bot-to-bot communication through the use of the Virtual Agent API. Below are steps to setup a personal instance or connect to an existing instance.

## Overview

### Key Features

The main features in the Virtual Agent API include:

* Provider authentication and user authorization
* User ID linking to their ServiceNow accounts
* Virtual Agent with transfer to Live Agent or connect with Live Agent directly
* Intent classification in bot-to-bot integrations
  * Primary bot determines the user intent and sends the user request to the ServiceNow Virtual Agent so that the corresponding topic is displayed to the user.
  * Primary bot sends the user utterance to the ServiceNow Virtual Agent so that it can discover the intent and return a prediction confidence score. A higher confidence score indicates that the predicted topic more accurately matches the user utterance.

### Limitations

The Virtual Agent API does not support:

* Integrations with ServiceNow Virtual Agent as the primary bot
* Custom controls
* Notifications delivered through Virtual Agent
* Chat branding through this Virtual Agent API integration

### Chat Events Flow

1. User Input
    * User interacts with SOE via MS Bot Service channels, e.g. Direct Line or MS Teams
2. POST Request JSON (Scripted REST API)
    * SOE makes a request containing relevant interaction attributes to the SNOW VA via the integration endpoint.
    * Requester will receive response `{status: success}`
3. Authentication & Request Processing
    * Request is processed and authenticated, request contents are sent to the VA and a session is started. VA will attempt to decipher intent or forward the interact to a Live Agent.
4. POST Response JSON
    * Once the initial request has been processed it will send the contents of the VA Response on a separate endpoint (configured in SOE and ServiceNow).
5. Bot Response
    * Contents from VA is unpacked and delivered to the user.

---

## Setup

ServiceNow bot adapter requires inbound endpoint to be exposed to Service Now. For this purpose you can expose you local instance using [ngrok](https://ngrok.com/download)

```BASH
ngrok http 3978
```

### Personal Development Instance

ServiceNow offers a free Personal Development Instance (PDI) with sample data to get developers started. To setup a ServiceNow PDI do the following:

1. Sign into the [ServiceNow Developer Site](https://developer.servicenow.com/)
2. In the header of the developer site, click `Request an Instance`.
3. Select the version of PDI you would like to create.
4. Select `Request`.
![](https://developer.servicenow.com/app_store_learnv2_buildmyfirstapp_rome_servicenowbasics_images_bmfa_requestinstance.png)
    * This will dial up a personal development instance which may take a few moments to create
5. When the instance becomes available, click `Open Instance`.
    * You will be provided a link to the development environment and an admin username/password - save this info.

For more information, check out [ServiceNow: Personal Development Instance](https://developer.servicenow.com/dev.do#!/learn/learning-plans/rome/new_to_servicenow/app_store_learnv2_buildmyfirstapp_rome_personal_developer_instances)

### Installing the Virtual Agent API

Connect to the ServiceNow Instance with Admin Access and do the following:

1. In the navigation search bar on the left side of the screen, search `Plugins`.
2. Search for `Glide Virtual Agent` plugin and install it. This may take a few moments.
3. Activate Virtual Agent Plugin:
   1. Navigate to System Applications > All Available Applications > All.
   2. Find the plugin using the filter criteria and search bar. You can search for the plugin by its name (`Virtual Agent API`) or ID (`sn_va_as_service`).
   3. Click Install, and then in the Activate Plugin dialog box, click Install.

For more information about ServiceNow Virtual Agent API read: [Plugin Link](https://store.servicenow.com/sn_appstore_store.do#!/store/application/62c44c6353311010ad77ddeeff7b120c/3.0.0?referer=%2Fstore%2Fsearch%3Flistingtype%3Dallintegrations%25253Bancillary_app%25253Bcertified_apps%25253Bcontent%25253Bindustry_solution%25253Boem%25253Butility%25253Btemplate%26q%3Dvirtual%2520agent%2520api&sl=sh)

For more information how to install Virtual Agent API, check out [ServiceNow: Install the Virtual Agent API](https://docs.servicenow.com/bundle/paris-now-intelligence/page/administer/virtual-agent/task/install-virtual-agent-api.html)

### Configure Inbound Endpoint

Connect to the ServiceNow Instance with Admin Access and do the following:

1. In the navigation search bar search `Scripted REST APIs`.
2. In Scripted REST APIs find the `VA Bot Integration` integration record.
3. In the Resources Table at the bottom of the screen select the `Bot Integration` resource.
![](https://docs.servicenow.com/bundle/paris-now-intelligence/page/administer/virtual-agent/images/scripted-rest-api-endpoint.png?_LANG=enus)
4. Copy the resource path endpoint `https://<YOUR INSTANCE>/api/sn_va_as_service/bot/integration`
    * Note: you can configure the endpoint as you wish, though it might be easier to leave it as the the default value.
    * This will be the endpoint use to send requests to the Virtual Agent. Note that the calls are aynchronous and will respond back on the response endpoint.
5. Select the `Requires Authentication` checkbox for the Resource.
    * This is more of a best practice step and allows basic authorization or any tokens that have been added to the HTTP Auth list to be accepted. The request itself will also contain a static token.

For more information, check out [Configure Inbound Endpoint](https://docs.servicenow.com/bundle/paris-now-intelligence/page/administer/virtual-agent/task/configure-send-request.html)

### Configure Token Verification

1. In the navigation search bar search `token_verification.list` and hit enter.
2. Create a new Token Verification.
    * Name: `ACAServiceNowBot2Bot`
    * Description: Token used to connect Bot2Bot requests from ACA to ServiceNow.
    * Token: Create your own token and paste it into the field.

### Set Up Provider Authentication

1. In the navigation search bar search `message_auth.list` and hit enter.
2. Create a new Message Auth.
    * Name: `B2B Auth Token`
    * Provider: `ACA`
    * Group Name: Not Required
    * Service Portal: Not Required
    * Inbound Message verification: Select the static token configured in the previous step `ACAServiceNowBot2Bot`.
    * Outbound message creation: Select the static token configured in the previous step `ACAServiceNowBot2Bot`.
    * Outbound Service Token: Select the static token configured in the previous step `ACAServiceNowBot2Bot`.
    * Select `Submit`.

### Set the Channel Identity

1. In the navigation search bar search `sys_cs_provider_application.list`.
2. Open the `VA Bot to Bot Provider Application` record.
3. Edit the field `Message Auth` and select the message auth configured in the previous step `B2B Auth Token`.
4. Click the `Update` button.

### Configure Response REST Endpoint

Since the Virtual Agent API is an asynchronous API it requires an endpoint to callback to. Make sure that you have ngrok proxy running and listening for incoming API requests on `/bots/snow/response` endpoint like this: `https://<NGROK_HOST>/bots/snow/response`

To configure the response endpoint in Service Now do the following:

1. In the nvigation search bar search `REST Message`.
2. Open the `VA Bot to Bot` record.
3. In the endpoint field, enter the response endpoint you would like to have the output of the VA Response sent to.
![](https://docs.servicenow.com/bundle/paris-now-intelligence/page/administer/virtual-agent/images/REST-response-endpoint.png?_LANG=enus)
    * Do this for both the REST Message and the HTTP Methods
4. If necessary, configure the Authentication Type (Basic Authentication and OAuth 2.0 are supported)
5. Click the `Update` button.

For more information, check out [Configuration of Output Reponse REST Endpoint](https://docs.servicenow.com/bundle/paris-now-intelligence/page/administer/virtual-agent/task/configure-response-endpoint-va-api.html)

## Debugging

1. Make sure the property `va.bot.to.bot.logging_enabled` is set to true under `sys_properties.list` table.
2. Check `glide.outbound_http.content.max_limit` property if it's large enough to press the payload (e.g. `100000`)
3. Go to: "System Log" -> "All" -> Filter on Source = `sn_va_as_service`
4. View the logs concerned with the VA API Integration

## LICENSE

© Copyright IBM Corporation 2022. All Rights Reserved.
