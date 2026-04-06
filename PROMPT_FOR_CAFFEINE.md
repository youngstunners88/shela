You are receiving a Caffeine-ready rewrite of Bhubezi.

Treat this package as the source of truth for the app.

Goals:
1. Keep the product South Africa-specific and taxi-rank-centric.
2. Preserve the three-role system: Passenger, Driver, Marshal.
3. Preserve the core loops:
   - passenger asks / pings
   - driver responds / updates route occupancy
   - marshal updates rank status / verifies community info
   - social + feedback + points increase engagement
4. Keep the Motoko backend authoritative for routes, pings, posts, FAQs, suggestions, and points.
5. Keep the React frontend modular and maintainable.
6. Build out any missing bindings, auth wiring, and persistence polish without changing the product intent.

Important domain rules:
- Taxi ranks are central objects, not generic map pins.
- Fares are community-verified.
- Marshal updates are trusted signals.
- Low-friction mobile UX matters more than visual complexity.
