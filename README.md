# Cloudflare Realtime SFU sample application

This repository contains a sample application that demonstrates how to use the serverless [Cloudflare Realtime](https://developers.cloudflare.com/realtime/) SFU (Selective Forwarding Unit) for real-time communication.

## Setup

To start this application, you need to create a `.dev.vars` file with the following content:

```
SFU_APP_ID=<YOUR_CLOUDFLARE_SFU_APP_ID>
SFU_APP_TOKEN="<YOUR_CLOUDFLARE_SFU_APP_TOKEN>

```

### TURN (optional)

You can also use the Cloudflare [TURN](https://developers.cloudflare.com/realtime/turn/) (Traversal Using Relays around NAT) service to facilitate media relay in cases where direct peer-to-peer connections are not possible. This is particularly useful for users behind strict NATs or firewalls.

To use TURN, you need to add the following to your `.dev.vars` file:

```
TURN_TOKEN_ID=<YOUR_CLOUDFLARE_TURN_TOKEN_ID>
TURN_API_TOKEN=<YOUR_CLOUDFLARE_TURN_API_TOKEN>
```
