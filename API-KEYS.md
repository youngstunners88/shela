# 🔑 CRITICAL: ALL API KEYS FOR KIMI

## ⚠️ WARNING: DELETE THIS FILE AFTER USE

---

## POLYMARKET CLOB

**Key Name:** `PolygonPK`
**Location:** Environment variable OR `/home/.z/secrets.json`
**Value:** [REDACTED - check secrets.json or env]
**Wallet:** 0x141f7D9a6Ab4221F36E21673b43FA751Af37E7eB
**Network:** Base (Chain 8453) + Polygon (Chain 137)

**Usage:**
```python
from py_clob_client.client import ClobClient
client = ClobClient("https://clob.polymarket.com", key=os.getenv('PolygonPK'))
```

---

## DUNE ANALYTICS

**Key Name:** `DUNE_API`
**Location:** `/home/.z/secrets.json`
**Query IDs:**
- 6157425: US dominance threshold
- 01K9D93GJ4A8ZQNE: Whale wallet tracking

**Usage:**
```bash
curl -H "X-DUNE-API-KEY: $DUNE_API" \
  https://api.dune.com/api/v1/query/6157425/execute
```

---

## BINANCE

**Key Name:** `Binance_API`
**Location:** `/home/.z/secrets.json`
**Purpose:** Temporal arbitrage (80ms vs 900ms latency)

**Usage:**
```python
from binance.client import Client
client = Client(api_key, api_secret)
```

---

## N8N WEBHOOK

**URL:** `https://kofi.zo.space/n8n`
**Auth:** Token in n8n settings
**Purpose:** Automation workflow triggers

---

## TELEGRAM

**Bot:** @youngstunnersssss
**Connected:** Yes
**Purpose:** Trade notifications, alerts

---

## GITHUB

**Repo:** github.com/youngstunners88
**Token:** [Check gh auth status]
**Lumina Vault:** github.com/youngstunners88/lumina-vault

---

## HOW TO ACCESS

```bash
# Method 1: Environment variables
env | grep -E "(PolygonPK|DUNE_API|Binance)"

# Method 2: Secrets file
python3 -c "import json; d=json.load(open('/home/.z/secrets.json')); print(list(d.keys()))"

# Method 3: Direct file
cat /home/.z/secrets.json | python3 -m json.tool
```

---

**Last Updated:** 2026-03-10
**Delete After:** Kimi takeover complete
