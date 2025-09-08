# Changelog

# 0.2.5

Minor improvements

- Exposed `command` method, which was previously only available internally

This is a thin wrapper that allows you to directly call arbitrary HomeAssistant WebSocket API commands. For example, to retrieve a list of persistent notifications:

```ts
async function getPersistentNotifications() {
  const notifications = await hass.command('persistent_notification/get');

  if (notifications.length > 0) {
    notifications.forEach((notif) => {
      console.log(notif.title, notif.message);
    });
  }
}
```

This was previously only possible by directly acessing the websocket client, and managing the command result-phase manually (including incrementing the internal message ID correctly).

- Fixed an issue with an outdated value in `package.json`
- Updated some of the type annotations for clarity

# 0.2.0

Typescript rewrite

- Rewrote codebase in Typescript
- Migrated to use Yarn instead of npm
- Simplified event subscription flow for most common case: homeassistant-ws automatically subscribes to all events, and
  handles delegation internally.

## 0.1.1

Quality of life improvements:

- Add initial type information
- Fix issue where WebSocket errors were wrapped in a new `Error` before a `reject()`
- Update README

## 0.1.0

First release
