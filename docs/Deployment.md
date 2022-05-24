<!--
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
-->
# Deployment Guidelines

## Azure cloud

Instructions below describe a quick way how to build and push a Docker image to Azure container registry using VS Code extension for Azure or CLI tools.

### Deployment with Docker CLI and VS Code plugin

1. Ensure [Azure Resources Extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azureresourcegroups) is installed in VSCode
2. Ensure [Docker Extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker) is installed in VSCode
3. Build the docker image using command  

    ```bash
    docker build . -t some-registry.azurecr.io/multi-bot-soe:latest
    ```

    Ensure that tag contains correct bot registry url and the docker image name that is linked with the web app.
4. Navigate to new `Docker` tab, under `images` subscription and right click newly created image. Press `push` and confirm popup messages

### Deployment with Podman CLI and Azure CLI

There is an alternative to docker, it is podman!

1. Install: `brew install podman`
2. Download and prepare the VM: `podman machine init`
3. Turn on the VM: `podman machine start`
4. Uses as a docker (test): `podman run -d -p 8000:80 nginx`
5. Verify container is running (test): `podman ps`

#### Build new image

```bash
podman build . -t -t some-registry.azurecr.io/multi-bot-soe:latest
```

#### Push image to remote registry

1. Create a sym link for docker binary:
   - Mac Homebrew M1:

     ```bash
     ln -s /opt/homebrew/bin/podman /usr/local/bin/docker || true
     ```

   - Mac Homebrew Intel:

     ```bash
     ln -s /usr/local/bin/podman /usr/local/bin/docker || true
     ```

2. Login to Azure container registry:

    ```bash
    az login
    az acr login --name some-registry
    ```

3. Push the image:

    ```bash
    podman push  some-registry.azurecr.io/multi-bot-soe:latest
    ```

For more details, take a look at official [Azure documentation](https://docs.microsoft.com/en-us/azure/container-registry/container-registry-get-started-docker-cli?tabs=azure-cli):

## LICENSE

© Copyright IBM Corporation 2022. All Rights Reserved.
