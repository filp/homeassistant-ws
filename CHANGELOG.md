# Changelog

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
