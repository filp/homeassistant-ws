import EventEmitter from 'events'
import WebSocket from 'isomorphic-ws'

const defaultOptions = {
  protocol: 'ws',
  host: 'localhost',
  port: 8123,
  path: '/api/websocket',
  token: null,

  messageSerializer: fullMessage => JSON.stringify(fullMessage),
  messageParser: fullMessage => JSON.parse(fullMessage.data),

  // A method that returns a websocket instance. Can be overriden to use a custom behavior:
  ws (opts) {
    return new WebSocket(`${opts.protocol}://${opts.host}:${opts.port}${opts.path}`)
  }
}

async function command (commandArgs, client) {
  return new Promise((resolve, reject) => {
    const id = client.seq

    client.resultMap[id] = resultMessage => {
      if (resultMessage.success) resolve(resultMessage.result)
      else reject(new Error(resultMessage.error.message))

      // We won't need this callback again once we use it:
      delete client.resultMap[id]
    }

    client.ws.send(client.options.messageSerializer({
      ...commandArgs, id
    }))

    // Increment the shared message id sequence:
    client.seq++
  })
}

function binaryResultTransform (result) {
  return {
    content_type: result.content_type,
    content: Buffer.from(result.content, 'base64')
  }
}

function messageHandler (client) {
  return wsMessage => {
    const message = client.options.messageParser(wsMessage)

    // Emit an event for any message of any type:
    if (message.type) client.emitter.emit(message.type, message)

    // Emit an event for event-type messages:
    if (message.type === 'event' && message.event.event_type) {
      client.emitter.emit(message.event.event_type, message.event)
    }

    // If this is a result message, match it with the results map on the client
    // and call the matching function:
    if (message.id && message.type === 'result') {
      if (typeof client.resultMap[message.id] !== 'undefined') {
        client.resultMap[message.id](message)
      }
    }
  }
}

function clientObject (client) {
  return {
    rawClient: client,

    getStates: async () => command({ type: 'get_states' }, client),
    getServices: async () => command({ type: 'get_services' }, client),
    getPanels: async () => command({ type: 'get_panels' }, client),
    getConfig: async () => command({ type: 'get_config' }, client),

    // Shortcut for .on('state_changed)
    async onStateChanged (cb) {
      return this.onEvent('state_changed', cb)
    },

    async onAnyEvent (cb) {
      if (typeof client.eventSubscriptions[-1] === 'undefined') {
        const sub = await command({ type: 'subscribe_events' }, client)
        client.eventSubscriptions[-1] = sub
      }

      // We already have an emitter for 'event' which we use to split up
      // events for each event_type - we just hook into it here:
      return client.emitter.on('event', (message) => cb(message.event))
    },

    async onEvent (eventName, cb) {
      if (typeof client.eventSubscriptions[eventName] === 'undefined') {
        const sub = await command({
          type: 'subscribe_events',
          event_type: eventName
        }, client)

        client.eventSubscriptions[eventName] = sub
      }

      return client.emitter.on(eventName, cb)
    },

    async unsubscribeFromEvent (eventName) {
      const sub = client.eventSubscriptions[eventName]

      if (typeof sub !== 'undefined') {
        await command({ type: 'unsubscribe_events', subscription: sub.id })
        delete client.eventSubscriptions[eventName]
      }
    },

    async callService (domain, service, additionalArgs = {}) {
      return command({
        type: 'call_service',
        domain,
        service,
        service_data: additionalArgs
      }, client)
    },

    async getMediaPlayerThumbnail (entityId) {
      return command({
        type: 'media_player_thumbnail',
        entity_id: entityId
      }, client).then(binaryResultTransform)
    },

    async getCameraThumbnail (entityId) {
      return command({
        type: 'camera_thumbnail',
        entity_id: entityId
      }, client).then(binaryResultTransform)
    }
  }
}

async function connectAndAuthorize (client, resolveWith) {
  return new Promise((resolve, reject) => {
    client.ws.onmessage = messageHandler(client)
    client.ws.onerror = err => reject(new Error(err))

    client.emitter.on('auth_ok', () => resolve(resolveWith))
    client.emitter.on('auth_invalid', (msg) => reject(new Error(msg.message)))
    client.emitter.on('auth_required', () => {
      // If auth is required, immediately reject the promise if no token was provided:
      if (!client.options.token) {
        reject(new Error('Homeassistant requires authentication, but token not provided in options'))
      }

      client.ws.send(client.options.messageSerializer({
        type: 'auth', access_token: client.options.token
      }))
    })
  })
}

export default async function createClient (callerOptions = {}) {
  const options = { ...defaultOptions, ...callerOptions }
  const client = {
    seq: 1,
    options,
    resultMap: {},
    eventSubscriptions: {},
    emitter: new EventEmitter(),
    ws: options.ws(options)
  }

  return connectAndAuthorize(client, clientObject(client))
}
