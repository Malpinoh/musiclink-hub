# Architecture rules

- Keep subscription request validation and error mapping in a function-local handler with injectable database access; this permits tests without modifying production records.
- Spotify web OAuth must bind state to a random, expiring browser-session nonce and a same-origin callback/return path; this prevents unsolicited callbacks while preserving the deployed token exchange.