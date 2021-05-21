import EventEmitter from 'events';
import WebSocket from 'isomorphic-ws';

type HassWsOptions = {
  protocol: 'ws' | 'wss';
  host: string;
  port: number;
  path: string;
  token: string;
  messageSerializer: (outgoingMessage: any) => string;
  messageParser: (incomingMessage: MessageEvent) => any;
  ws: (opts: HassWsOptions) => WebSocket;
};

type HassClient = {
  seq: number;
  options: HassWsOptions;
  resultMap: { [resultId: number]: any };
  eventListeners: { [eventType: string]: (event: Event) => void };
  emitter: EventEmitter;
  ws: WebSocket;
};

type HassCommandArgs = {
  type:
    | 'call_service'
    | 'get_states'
    | 'get_services'
    | 'get_panels'
    | 'get_config'
    | 'media_player_thumbnail'
    | 'camera_thumbnail';

  [additionalArg: string]: any;
};

type HassApi = {
  rawClient: HassClient;
  getStates: () => Promise<any[]>;
  getServices: () => Promise<any[]>;
  getPanels: () => Promise<any[]>;
  getConfig: () => Promise<{}>;

  getMediaPlayerThumbnail: (entityId: string) => Promise<{}>;
  getCameraThumbnail: (entityId: string) => Promise<{}>;

  callService: (
    domain: string,
    service: string,
    extraArgs?: any
  ) => Promise<any>;
};

const defaultOptions: Partial<HassWsOptions> = {
  protocol: 'ws',
  host: 'localhost',
  port: 8123,
  path: '/api/websocket',

  messageSerializer: (outgoingMessage: any) => JSON.stringify(outgoingMessage),
  messageParser: (incomingMessage: { data: string }) =>
    JSON.parse(incomingMessage.data),

  // A method that returns a websocket instance. Can be overriden to use a custom behavior:
  ws: (opts: HassWsOptions) => {
    return new WebSocket(
      `${opts.protocol}://${opts.host}:${opts.port}${opts.path}`
    );
  },
};

async function command(
  commandArgs: HassCommandArgs,
  client: HassClient
): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = client.seq;

    client.resultMap[id] = (resultMessage: any) => {
      if (resultMessage.success) resolve(resultMessage.result);
      else reject(new Error(resultMessage.error.message));

      // We won't need this callback again once we use it:
      delete client.resultMap[id];
    };

    client.ws.send(
      client.options.messageSerializer({
        ...commandArgs,
        id,
      })
    );

    // Increment the shared message id sequence:
    client.seq++;
  });
}

function binaryResultTransform(result: any) {
  return {
    content_type: result.content_type,
    content: Buffer.from(result.content, 'base64'),
  };
}

function messageHandler(client: HassClient) {
  return (wsMessage: MessageEvent) => {
    const message = client.options.messageParser(wsMessage);

    // Emit an event for any message of any type:
    if (message.type) client.emitter.emit(message.type, message);

    // Emit an event for event-type messages:
    if (message.type === 'event' && message.event.event_type) {
      client.emitter.emit(message.event.event_type, message.event);
    }

    // If this is a result message, match it with the results map on the client
    // and call the matching function:
    if (message.id && message.type === 'result') {
      if (typeof client.resultMap[message.id] !== 'undefined') {
        client.resultMap[message.id](message);
      }
    }
  };
}

function clientObject(client: HassClient): HassApi {
  return {
    rawClient: client,

    getStates: async () => command({ type: 'get_states' }, client),
    getServices: async () => command({ type: 'get_services' }, client),
    getPanels: async () => command({ type: 'get_panels' }, client),
    getConfig: async () => command({ type: 'get_config' }, client),

    async callService(domain, service, additionalArgs = {}) {
      return command(
        {
          type: 'call_service',
          domain,
          service,
          service_data: additionalArgs,
        },
        client
      );
    },

    async getMediaPlayerThumbnail(entityId) {
      return command(
        {
          type: 'media_player_thumbnail',
          entity_id: entityId,
        },
        client
      ).then(binaryResultTransform);
    },

    async getCameraThumbnail(entityId) {
      return command(
        {
          type: 'camera_thumbnail',
          entity_id: entityId,
        },
        client
      ).then(binaryResultTransform);
    },
  };
}

async function connectAndAuthorize(client: HassClient, resolveWith: HassApi) {
  return new Promise((resolve, reject) => {
    client.ws.onmessage = messageHandler(client);
    client.ws.onerror = (err: Error) => reject(err);

    client.emitter.on('auth_ok', () => resolve(resolveWith));
    client.emitter.on('auth_invalid', (msg: Error) =>
      reject(new Error(msg.message))
    );
    client.emitter.on('auth_required', () => {
      // If auth is required, immediately reject the promise if no token was provided:
      if (!client.options.token) {
        reject(
          new Error(
            'Homeassistant requires authentication, but token not provided in options'
          )
        );
      }

      client.ws.send(
        client.options.messageSerializer({
          type: 'auth',
          access_token: client.options.token,
        })
      );
    });
  });
}

export default async function createClient(
  callerOptions: Partial<HassWsOptions> = {}
) {
  const options = {
    ...defaultOptions,
    ...callerOptions,
  } as HassWsOptions;

  const client: HassClient = {
    seq: 1,
    options,
    resultMap: {},
    eventListeners: {},
    emitter: new (EventEmitter as any)(),
    ws: options.ws(options),
  };

  return connectAndAuthorize(client, clientObject(client));
}
