declare module "homeassistant-ws" {
  type WebsocketMessage = {};
  type State = {};
  type Service = {};
  type Panel = {};
  type ServiceCallOptions = {};
  type Result = {};
  type EventData = {};
  type EntityId = string;

  interface Config {
    protocol?: "ws" | "wss";
    host?: string;
    port?: number;
    path?: string;
    token?: string;
    
    messageSerializer: (outgoingMessage: WebsocketMessage) => string;
    messageParser: (incomingMessage: string) => WebsocketMessage;

    ws: (options: Config) => WebSocket;
  }

  interface BinaryContentResult {
    content: Buffer;
    content_type: string;
  }

  interface EventCallback {
    (event: EventData): void
  }

  interface Client {
    rawClient: {};

    getStates: () => Promise<State[]>;
    getPanels: () => Promise<Panel[]>;
    getServices: () => Promise<Service[]>;
    getConfig: () => Promise<Config>;

    onAnyEvent: (callback: EventCallback) => Promise<void>;
    onStateChanged: (callback: EventCallback) => Promise<void>;
    onEvent: (eventName: string, callback: EventCallback) => Promise<void>;
    unsubscribeFromEvent: (eventName: string) => Promise<void>;

    callService: (domain: string, service: string, additionalArgs?: ServiceCallOptions) => Promise<Result>;
    getMediaPlayerThumbnail: (entityId: EntityId) => Promise<BinaryContentResult>;
    getCameraThumbnail: (entityId: EntityId) => Promise<BinaryContentResult>;
  }

  export default function createClient (options: Config): Promise<Client>;
}
