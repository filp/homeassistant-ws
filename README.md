# homeassistant-ws

[![npm](https://img.shields.io/npm/v/homeassistant-ws?color=%23ff11dd&style=flat-square)](https://www.npmjs.com/package/homeassistant-ws)
[![GitHub](https://img.shields.io/github/license/filp/homeassistant-ws?style=flat-square)](https://github.com/filp/homeassistant-ws/blob/master/LICENSE.md)

Minimalist client library for [Homeassistant's Websocket API](https://developers.home-assistant.io/docs/external_api_websocket). Works in node, and also in the browser.

---

## Installation:

Using `npm`:

```shell
$ npm i --save homeassistant-ws
```

Import it in your project:

```js
import hass from 'homeassistant-ws'

async function main () {
  // Assuming hass running in `localhost`, under the default `8321` port:
  const client = await hass({
    token: 'my-secret-token'
  })
}
```

Tokens are available from your profile page under the Homeassistant UI. For documentation on the authentication API, see [the official HA documentation](https://developers.home-assistant.io/docs/auth_api/).


## Configuration options

The following properties (shown with their defaults) can be passed to the constructor. All are optional.

```js
hass({
  protocol: 'ws',
  host: 'localhost',
  port: 8123,
  path: '/api/websocket',

  // Must be set if HA expects authentication:
  token: null,

  // Used to serialize outgoing messages: 
  messageSerializer: outgoingMessage => JSON.stringify(outgoingMessage),

  // Used to parse incoming messages. Receives the entire Websocket message object:
  messageParser: incomingMessage => JSON.parse(incomingMessage.data),

  // Should return a WebSocket instance
  ws (opts) {
    return new WebSocket(`${opts.protocol}://${opts.host}:${opts.port}${opts.path}`)
  }
})
```

## Example

The following example includes all available methods. For more details on available Homeassistant event types, states, etc. see the [official Websocket API](https://developers.home-assistant.io/docs/external_api_websocket)

```js
import hass from 'hass'

async function main () {
  // Establishes a connection, and authenticates if necessary:
  const client = await hass({ token: 'my-token' })

  // Get a list of all available states, panels or services:
  await client.getStates()
  await client.getServices()
  await client.getPanels()

  // Get hass configuration:
  await client.getConfig()

  // Get a Buffer containing the current thumbnail for the given media player
  await client.getMediaPlayerThumbnail('media_player.my_player')
  // { content_type: 'image/jpeg', content: Buffer<...>}

  // Get a Buffer containing a thumbnail for the given camera
  await client.getCameraThumbnail('camera.front_yard')
  // { content_type: 'image/jpeg', content: Buffer<...>}

  // Call a service, by its domain and name. The third argument is optional.
  await client.callService('lights', 'turn_on', { entity_id: 'light.my_light' })

  // Register event handlers. Return a promise since we need to call the HA API to
  // subscribe to events the first time.
  await client.onAnyEvent((event) => console.log(event))
  await client.onStateChanged((event) => console.log(event))
  await client.onEvent('event_name', (event) => console.log(event))

  // Tell HA to stop sending events of the following type:
  await client.unsubscribeFromEvent('event_name')
}
```
