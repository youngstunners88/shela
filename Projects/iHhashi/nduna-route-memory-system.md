# Nduna Route Memory System
## Lightweight Driver Knowledge Capture for iHhashi

### Problem
- External routing APIs (Google Maps, etc.) are expensive and don't understand SA road realities
- Drivers have local knowledge that's not captured anywhere
- Every missed shortcut, traffic pattern, or road condition insight is lost

### Solution: Route Memory System

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    DRIVER APP                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Route       │  │ Time        │  │ Condition       │  │
│  │ Feedback    │  │ Tracking    │  │ Reporting       │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
└─────────┼────────────────┼──────────────────┼───────────┘
          │                │                  │
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                 ROUTE MEMORY API                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Submit      │  │ Query       │  │ Aggregate       │  │
│  │ Insight     │  │ Routes      │  │ Learning        │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│              ROUTE MEMORY DATABASE                       │
│  • route_segments (polylines with metadata)             │
│  • driver_insights (qualitative notes)                  │
│  • actual_times (real delivery duration data)           │
│  • conditions (weather, traffic, time-of-day factors)   │
└─────────────────────────────────────────────────────────┘
```

---

## Data Models

### 1. Route Segment
```typescript
interface RouteSegment {
  id: string;
  start_point: { lat: number; lng: number };
  end_point: { lat: number; lng: number };
  polyline: string; // Encoded path
  distance_m: number;
  
  // Aggregated insights
  avg_time_seconds: number;
  difficulty_rating: 1-5; // Driver-rated
  road_type: 'highway' | 'main' | 'residential' | 'informal' | 'dirt';
  
  // Time-based factors
  peak_hour_factor: number; // e.g., 1.5x slower at 5pm
  weekend_factor: number;
  rainy_factor: number;
  
  // Local knowledge
  common_shortcuts: Shortcut[];
  avoid_times: AvoidTime[];
  
  created_at: Date;
  updated_at: Date;
  confidence: number; // How many data points support this
}
```

### 2. Driver Insight
```typescript
interface DriverInsight {
  id: string;
  driver_id: string;
  segment_id: string;
  
  // Quick feedback types
  type: 'shortcut' | 'avoid' | 'slow_zone' | 'good_alternative' | 'road_work' | 'unsafe';
  
  description: string; // Free-form note
  location: { lat: number; lng: number };
  
  // When this applies
  time_relevant: boolean;
  applicable_hours?: { start: number; end: number };
  days_of_week?: number[];
  
  // Community validation
  upvotes: number;
  downvotes: number;
  verified: boolean;
  
  created_at: Date;
  expires_at?: Date; // For temporary issues like road work
}
```

### 3. Actual Time Record
```typescript
interface ActualTimeRecord {
  id: string;
  driver_id: string;
  route_id: string;
  segment_id: string;
  
  // What happened
  expected_time_seconds: number; // What routing API predicted
  actual_time_seconds: number;   // What it really took
  
  // Context
  time_of_day: number; // Hour 0-23
  day_of_week: number; // 0-6
  weather: 'clear' | 'rain' | 'heavy_rain';
  
  // Outcome
  delivery_successful: boolean;
  delay_reason?: string;
  
  created_at: Date;
}
```

---

## Driver App Features

### 1. Passive Time Tracking
Automatically tracks actual route times without driver input:
- Start timer when route begins
- Compare predicted vs actual
- Store for learning

### 2. Quick Feedback Buttons
After each delivery, simple one-tap feedback:
```
┌─────────────────────────────────────┐
│  How was this route?                │
│                                     │
│  [😊 Smooth] [😐 OK] [😤 Delayed]   │
│                                     │
│  Tap to add details:                │
│  [🚧 Road Work] [🚦 Heavy Traffic]  │
│  [☔ Weather] [⚠️ Unsafe Area]      │
│  [💡 Better Route Available]        │
└─────────────────────────────────────┘
```

### 3. Shortcut Reporter
When driver takes a better route:
```
┌─────────────────────────────────────┐
│  🎯 You saved 8 minutes!            │
│                                     │
│  Share this shortcut?               │
│  [Yes, save for all] [No, just me]  │
│                                     │
│  Add note (optional):               │
│  [_________________________]        │
└─────────────────────────────────────┘
```

### 4. Local Knowledge Map
Drivers can view and validate community insights:
- See what other drivers have reported
- Upvote/downvote accuracy
- Add their own notes

---

## API Endpoints

### Submit Insight
```
POST /api/route-memory/insight
{
  "driver_id": "drv_123",
  "type": "shortcut",
  "location": { "lat": -26.2041, "lng": 28.0473 },
  "description": "Cut through the shopping centre parking lot",
  "saves_minutes": 5
}
```

### Get Route Intelligence
```
GET /api/route-memory/intelligence?from=-26.2041,28.0473&to=-26.1951,28.0553
Response:
{
  "segments": [...],
  "insights": [
    {
      "type": "avoid",
      "reason": "Road works until March 2025",
      "location": "Main & 5th"
    }
  ],
  "estimated_time_with_factors": 1245, // Adjusted for time of day
  "confidence": 0.85
}
```

### Submit Actual Time
```
POST /api/route-memory/actual-time
{
  "driver_id": "drv_123",
  "route_id": "route_456",
  "expected_seconds": 900,
  "actual_seconds": 1120,
  "time_of_day": 17,
  "weather": "clear"
}
```

---

## Learning Algorithm (Simple & Effective)

### Phase 1: Time Adjustment Factors
```python
def calculate_adjusted_time(segment, hour, day, weather):
    base_time = segment.avg_time_seconds
    
    # Apply learned factors
    if 7 <= hour <= 9 or 16 <= hour <= 18:
        base_time *= segment.peak_hour_factor
    
    if day in [0, 6]:  # Weekend
        base_time *= segment.weekend_factor
    
    if weather == 'rain':
        base_time *= segment.rainy_factor
    
    return base_time

# Update factors based on actual data
def update_factors(segment_id):
    records = get_records(segment_id)
    
    # Group by hour buckets
    peak_records = [r for r in records if 7 <= r.time_of_day <= 9 or 16 <= r.time_of_day <= 18]
    off_peak = [r for r in records if r not in peak_records]
    
    if peak_records and off_peak:
        peak_avg = mean([r.actual_time_seconds for r in peak_records])
        off_peak_avg = mean([r.actual_time_seconds for r in off_peak])
        segment.peak_hour_factor = peak_avg / off_peak_avg
```

### Phase 2: Community Weighting
```python
def get_insight_score(insight):
    # Weight by validation
    validation_score = (insight.upvotes - insight.downvotes) / (insight.upvotes + insight.downvotes + 1)
    
    # Weight by recency
    age_days = (now - insight.created_at).days
    recency_score = 1 / (1 + age_days / 30)  # Decay over months
    
    # Weight by driver reputation
    driver_reputation = get_driver_reputation(insight.driver_id)
    
    return validation_score * recency_score * driver_reputation
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2) ✓IN PROGRESS
- [x] Database schema setup
- [x] Basic API endpoints
- [x] Driver app: time tracking models
- [x] Driver app: simple feedback models
- [ ] Integration testing
- [ ] Driver app frontend integration

### Phase 2: Intelligence (Week 3-4)

### Phase 3: Community (Week 5-6)
- [ ] Insight validation system
- [ ] Driver reputation scoring
- [ ] Local knowledge map view
- [ ] Automated factor updates

### Phase 4: Integration (Week 7-8)
- [ ] Nduna uses route memory for ETAs
- [ ] Suggest best routes based on time
- [ ] Alert drivers to community insights
- [ ] Performance analytics dashboard

---

## Cost Analysis

### Zero External API Costs
- No Google Maps directions API ($5-7 per 1000 calls)
- No third-party routing services
- Self-contained learning system

### Infrastructure
- Database: Existing iHhashi infrastructure
- API: Minimal compute, can run on Nduna backend
- Storage: ~1KB per route segment, grows organically

### Driver Incentives
- Gamification: Drivers earn points for useful insights
- Leaderboard: Top contributors get recognition
- Efficiency: Better routes mean more deliveries, more earnings

---

## Success Metrics

1. **ETA Accuracy**: Improvement in predicted vs actual delivery times
2. **Insight Quality**: Ratio of upvotes to downvotes on driver insights
3. **Route Efficiency**: Average time saved per delivery
4. **Driver Engagement**: % of drivers submitting feedback regularly
5. **Knowledge Growth**: Number of verified route segments over time

---

## Next Steps

1. Review and approve design
2. Set up database tables
3. Build Phase 1 MVP
4. Test with pilot group of drivers
5. Iterate based on feedback