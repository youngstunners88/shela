# GitHub Sources - Property OSINT & Real Estate Intelligence

This document lists open-source tools and repositories relevant to building a property intelligence system.

## Foreclosure & Tax Delinquency Scrapers

### 1. ForeclosureAuctionPyScraper
**URL:** https://github.com/chee86j/ForeclosureAuctionPyScraper
- Python-based foreclosure auction data scraper
- Collects case numbers, sale dates, addresses, status
- Uses Selenium, BeautifulSoup, aiohttp
- SQLite database with CSV export
- Zillow URL integration for property insights

### 2. DrixTaxDeeds
**URL:** https://github.com/glb32/DrixTaxDeeds
- Python scraper for tax deeds and foreclosure data
- Sources: realforeclosure.com and realtaxdeed.com
- Focuses on tax delinquent properties
- Good for identifying motivated sellers

### 3. PropertyRecords (Tulsa-specific)
**URL:** https://github.com/ngallup/PropertyRecords
- Python prototype for motivated seller identification
- Gathers: ownership, foreclosure, eviction, tax records
- Targeted for Tulsa, OK but adaptable
- Google Maps-style visualization planned
- Predictive analytics for crime and value trends

### 4. property-scraper (Tax Delinquency)
**URL:** https://github.com/dominiccarroll/property-scraper
- JavaScript/Puppeteer-based scraper
- Focuses on tax delinquency data
- For real estate investment analysis
- Identifies foreclosures and motivated sellers

### 5. Lancaster Property Tax Scraper
**URL:** https://github.com/caesarw0/lancaster-property-tax-scraper
- Automated Python tool for Lancaster County, PA
- Extracts delinquent property tax data
- Processes parcel numbers, owner details, tax amounts
- Includes request throttling and error handling

## General Real Estate Data

### 6. HomeHarvest
**URL:** https://github.com/Bunsly/HomeHarvest
- Python library for real estate data scraping
- Primary source: Realtor.com
- MLS-like formatted data
- Flexible filtering (beds, baths, price, size, year built)
- Export to CSV, Excel, Pandas
- Advanced filtering and pagination

### 7. RealEstateForeclosures
**URL:** https://github.com/aryanvarshney/RealEstateForeclosures
- Python multi-source foreclosure aggregator
- Pulls from various bank websites
- Flask web API for data access
- Email notification service for new listings
- Web scraping with BeautifulSoup

### 8. foreclosure_property_scraper
**URL:** https://github.com/talhapythoneer/foreclosure_property_scraper
- Python scraper for Foreclosure.com
- Uses Scrapy and Selenium
- Login-protected site automation
- For tracking foreclosure and distressed properties

## OSINT Resources

### 9. OSINT Cheat Sheet
**URL:** https://github.com/Jieyab89/OSINT-Cheat-sheet
- Comprehensive OSINT tools list
- Free and paid tools
- Datasets, Maltego transforms
- Investigation techniques

### 10. OSINT Mastery Repository
**URL:** https://github.com/JambaAcademy/OSINT
- Covers federal, state, local databases
- Court records, property records, business filings
- Regulatory documents, international records

## Key Techniques to Implement

### Data Sources
1. **County Assessor Records** - Property details, ownership, tax status
2. **County Clerk Records** - Deeds, mortgages, liens, foreclosures
3. **Court Databases** - Probate, divorce, eviction records
4. **Business Registrations** - LLC formations, entity lookups
5. **Code Enforcement** - Violations, complaints
6. **Tax Lien Databases** - Delinquencies, tax sales

### Signal Detection
- Tax delinquency → High motivation (85/100)
- Foreclosure filing → Critical motivation (95/100)
- Probate case → Estate sale likely (80/100)
- Out-of-state owner → Absentee landlord (60/100)
- 15+ years owned → High equity (50/100)
- Code violations → Neglected property (70/100)
- Divorce filing → Asset liquidation (75/100)

### Buyer Identification
- Cash transaction patterns
- LLC acquisition tracking
- Hard money loan recipients
- Building permit applicants
- Frequent eviction filers

## Legal & Ethical Considerations

All data sources used must be:
- Publicly accessible records
- Not behind paywalls or requiring unauthorized access
- Compliant with local laws and regulations
- Used for legitimate real estate research purposes only

## Implementation Notes

When building production scrapers:
1. Respect rate limits (throttle requests)
2. Implement robust error handling
3. Use rotating proxies if needed
4. Cache data to reduce load on sources
5. Verify data accuracy across multiple sources
6. Keep data fresh with scheduled updates
