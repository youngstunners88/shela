# OpportunityScout Reports

## Recent Activity

**4 March 2026 (Evening - RevenueRadar):** Revenue intelligence report generated
- SA fruit exports surge to China (20K cartons plums) and India (2.87M cartons apples)
- ROAM launches AI fleet monitoring in Kenya (fleet opportunity)
- FMD emergency deepens - Royal Agricultural Show postponed
- Ecobank + Hub2 connect 200M+ mobile wallets (single API for 32 markets)
- Africa smartphone market up 14% Q4 2025 (SA +38% YoY)
- El Niño warning: below-average rainfall Nov 2026 - March 2027
- Q2 revenue potential: R8.5M-21.5M if actions executed

**5 March 2026 (Morning - RevenueRadar):** Revenue intelligence report generated
- Agentic AI ordering goes mainstream (DoorDash + Google Gemini)
- Vodafone + Amazon LEO satellites unlock rural African connectivity
- China zero tariffs for 53 African countries from May 2026
- Egypt's Breadfast raises $50M for quick-commerce expansion
- WhatsApp validated as key trust layer for African payments
- Q2 revenue potential: R8.5M-22M if actions executed

**4 March 2026 (Evening - RevenueRadar):** Revenue intelligence report generated
- FMD vaccination liability creates NEW logistics category (R5-10M opportunity)
- Uber Eats AI Cart Assistant launched - competitive threat
- Ecobank + Hub2 connect 200M+ mobile wallets (single API)
- SA agricultural exports hit $13.7B (10% growth)
- Q2 revenue potential: R8.5M-23M if actions executed

**4 March 2026 (Mid-Day):** Mid-day intelligence report generated
- FMD research breakthrough validated (Professor Bastos)
- AI payment infrastructure live in Europe (Mastercard + Santander)
- African payment patterns analyzed (friction builds trust)
- Tesla enters Africa, battery swapping validated
- Investment priorities identified: WhatsApp, FMD logistics, AI payments, electric fleet

**4 March 2026 (Morning):** Morning briefing generated
- Critical convergence: FMD research, AI payments, smartphone crisis
- Nigeria innovation push, cold chain logistics focus
- Chinese EVs available, agricultural partnerships emerging

**Report Archive:**
- 2026-03-05-revenueradar-report-morning.md
- 2026-03-04-revenueradar-report-evening.md
- 2026-03-04-opportunity-scout-report-midday.md
- 2026-03-04-opportunity-scout-report-morning.md
- 2026-03-03-opportunity-scout-report-evening.md
- 2026-03-03-opportunity-scout-report.md

## Phase 3 Reporting
- Price-gap, conversion, churn, and forecast intelligence queries live in `sql/phase3_reporting.sql`.
- These queries are written for DuckDB-style SQL (ANSI compatible) and assume tables under the following namespaces:
  - `live_pricing` for menu and competitor prices
  - `app_sales` for orders and checkout funnel data
  - `crm` for event tracking
  - `campaign_calendar` for offer metadata and customer touchpoints
  - `metrics` for forecasts and actuals
- Adjust schema or table names to match any future data lake layout before executing.
- The `sql/` folder is the canonical place to store queries used by the OpportunityScout reporting automation.
