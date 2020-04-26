# homeassistant-ws

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
  const client = hass({
    token: 'my-secret-token'
  })
}
```

Tokens are available from your profile page under the Homeassistant UI. For documentation on the authentication API, see [the official HA documentation](https://developers.home-assistant.io/docs/auth_api/).
