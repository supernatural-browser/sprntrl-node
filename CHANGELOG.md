# Changelog

## 0.1.6

- User-Agent now reports the real version, read from `package.json` at runtime (was hardcoded
  `sprntrl-node/0.1.0`). `package.json` is the single source of the version.
- `sessions.create()`: new `country`, `disable_geolocation`, `proxy_relay` and
  `fingerprint_overrides` options. `location` is now optional (pass `country` instead).
- `OS` accepts `"android"`.

## 0.1.5

- `sessions.create()`: `cache_pack`, `block_trackers`, `block_trackers_exclude`.
