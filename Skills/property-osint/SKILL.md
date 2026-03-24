---
name: property-osint
description: OSINT tool for identifying motivated real estate sellers and active buyers from public records. Scrapes property data, tax delinquencies, foreclosures, probate records, and ownership patterns to generate lead intelligence.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
  created: 2026-03-24
---

# Property OSINT Intelligence System

Identify motivated sellers and active buyers from public records using open-source intelligence techniques.

## What This Skill Does

This skill aggregates data from multiple public sources to identify:

**Motivated Sellers:**
- Tax delinquent property owners
- Properties in foreclosure/pre-foreclosure
- Estate/probate properties (inherited, often sell fast)
- Out-of-state owners (absentee landlords)
- Long-term holders (15+ years = high equity)
- Properties with code violations
- Divorce filings (asset liquidation)

**Active Buyers:**
- Cash buyers from recent transactions
- LLCs/entities actively acquiring
- Hard money loan recipients (flippers)
- Building permit applicants (investors expanding)
- Recent eviction filers (landlords adding units)

## Usage

```bash
# Search for motivated sellers in a county
bun /home/workspace/Skills/property-osint/scripts/search-sellers.ts --county "Harris County, TX" --motivation tax-delinquent,foreclosure

# Find cash buyers
bun /home/workspace/Skills/property-osint/scripts/search-buyers.ts --county "Harris County, TX" --timeframe 6months

# Full property intelligence report
bun /home/workspace/Skills/property-osint/scripts/property-report.ts --address "123 Main St, Houston, TX"

# Export leads to CSV
bun /home/workspace/Skills/property-osint/scripts/export-leads.ts --type sellers --format csv --output leads.csv
```

## Data Sources

- County Assessor Records (ownership, tax status, property details)
- Court Databases (probate, foreclosure, divorce, eviction)
- Business Registrations (LLC formations, entity lookups)
- Property Transfer Records (deeds, recent sales)
- Code Enforcement Databases
- Tax Lien Records

## Architecture

1. **Data Collection Layer** - Scrapers for each source type
2. **Processing Layer** - Normalization, deduplication, enrichment
3. **Signal Detection** - Pattern matching for motivation indicators
4. **Output Layer** - Reports, dashboards, CSV exports

## Reference GitHub Projects

Similar open-source tools for reference:
- https://github.com/chee86j/ForeclosureAuctionPyScraper - Foreclosure auction scraper
- https://github.com/glb32/DrixTaxDeeds - Tax deed data scraper
- https://github.com/ngallup/PropertyRecords - Motivated seller finder for Tulsa
- https://github.com/dominiccarroll/property-scraper - Tax delinquency scraper
- https://github.com/Bunsly/HomeHarvest - Realtor.com scraper
- https://github.com/aryanvarshney/RealEstateForeclosures - Multi-source foreclosure aggregator

## License

MIT - For educational and legitimate real estate research purposes only.
