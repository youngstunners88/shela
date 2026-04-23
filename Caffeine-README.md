# Bhubezi Caffeine Port

This package is a **Caffeine/ICP-oriented rewrite of Bhubezi**.

It is designed so a platform that prefers **Motoko backend + React/TypeScript frontend** can understand the app in one shot.

## What is preserved from Bhubezi

- Passenger / Driver / Marshal roles
- Jozi taxi rank + route model
- Onboarding flow
- Passenger pings and driver acceptance
- Rank status updates
- Social feed
- Community questions and fare verification
- Feedback / suggestions
- Points + leaderboard

## Architecture

- `src/backend/main.mo` — Motoko canister with seeded ranks/routes and CRUD methods
- `src/frontend/` — React + TypeScript frontend with a reducer-based store and clean service adapter

## Notes

- This is a **best-effort full-stack port**, not a byte-for-byte export of the old Vite app.
- The backend is written to be readable and easy for Caffeine to extend.
- The frontend includes a **mock fallback service** so the UX can still be demonstrated if canister bindings are not wired yet.

## Core product intent

Bhubezi is a community-powered Johannesburg minibus taxi network app. Passengers can discover routes, ping drivers, verify fares, and follow rank activity. Drivers can manage trips and occupancy. Marshals can update rank capacity and moderate community info.
