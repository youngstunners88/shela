-- SQL scripts for Phase 3: price gap alerts, conversion tiers, churn monitoring, and revenue vs forecast.
-- Designed for DuckDB but should run on any ANSI SQL-compatible warehouse.
-- Adjust schema names to match your production tables before running.

-- 1. Price gap summary (per city / cuisine / time bucket).
WITH restaurant_lookup AS (
  SELECT
    restaurant_id,
    city,
    cuisine,
    merchant_tier,
    location_zone,
    timezone
  FROM revenue.restaurants
),
menu_snapshots AS (
  SELECT
    mi.restaurant_id,
    rl.city,
    rl.cuisine,
    rl.merchant_tier,
    DATE_TRUNC('hour', mi.updated_at AT TIME ZONE COALESCE(rl.timezone, 'UTC')) AS price_hour,
    mi.menu_item_id,
    mi.item_name,
    mi.price AS our_price
  FROM live_pricing.menu_items mi
  JOIN restaurant_lookup rl ON mi.restaurant_id = rl.restaurant_id
  WHERE mi.updated_at >= DATE_TRUNC('day', CURRENT_TIMESTAMP - INTERVAL '3 days')
),
competitor_avg AS (
  SELECT
    city,
    cuisine,
    DATE_TRUNC('hour', captured_at AT TIME ZONE 'UTC') AS capture_hour,
    AVG(price) AS avg_competitor_price,
    AVG(delivery_fee) AS avg_comp_delivery_fee,
    AVG(surge_multiplier) AS avg_surge_multiplier,
    MAX(promotions) AS promotions_active
  FROM live_pricing.competitor_prices
  WHERE captured_at >= DATE_TRUNC('day', CURRENT_TIMESTAMP - INTERVAL '3 days')
  GROUP BY city, cuisine, capture_hour
),
price_gap AS (
  SELECT
    ms.city,
    ms.cuisine,
    ms.price_hour,
    ms.item_name,
    ROUND((ms.our_price - ca.avg_competitor_price) / NULLIF(ca.avg_competitor_price, 0) * 100, 2) AS gap_pct,
    ms.our_price,
    ca.avg_competitor_price,
    ca.avg_comp_delivery_fee,
    ca.avg_surge_multiplier,
    ca.promotions_active,
    ms.merchant_tier
  FROM menu_snapshots ms
  LEFT JOIN competitor_avg ca
    ON ca.city = ms.city
   AND ca.cuisine = ms.cuisine
   AND ca.capture_hour = ms.price_hour
)
SELECT *
FROM price_gap
WHERE ABS(gap_pct) >= 5
ORDER BY gap_pct DESC, price_hour DESC
LIMIT 50;

-- 2. Conversion and funnel performance by price tier (week over week).
WITH orders_cte AS (
  SELECT
    order_id,
    price_tier,
    DATE_TRUNC('week', order_datetime) AS week_start,
    total_amount AS order_value,
    CASE WHEN refund_flag = TRUE OR promo_code IS NULL AND delivered = FALSE THEN 1 ELSE 0 END AS fail_flag
  FROM app_sales.orders
  WHERE order_datetime >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '4 weeks')
),
checkout_completion AS (
  SELECT
    cs.order_id,
    MAX(CASE WHEN cs.step_name = 'order_completed' AND cs.step_status = 'success' THEN 1 ELSE 0 END) AS completed
  FROM app_sales.checkout_steps cs
  WHERE cs.step_timestamp >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '4 weeks')
  GROUP BY cs.order_id
),
conversion_base AS (
  SELECT
    o.price_tier,
    o.week_start,
    COUNT(DISTINCT o.order_id) FILTER (WHERE co.completed = 1) AS conversions,
    COUNT(DISTINCT o.order_id) AS funnel_entries,
    SUM(o.order_value) AS total_revenue,
    SUM(o.fail_flag) AS refunds_or_failed_deliveries
  FROM orders_cte o
  LEFT JOIN checkout_completion co ON co.order_id = o.order_id
  GROUP BY o.price_tier, o.week_start
)
SELECT
  price_tier,
  week_start,
  conversions,
  funnel_entries,
  CASE WHEN funnel_entries = 0 THEN 0 ELSE ROUND(conversions::numeric / funnel_entries * 100, 2) END AS conversion_rate_pct,
  ROUND(COALESCE(NULLIF(total_revenue, 0), 0) / NULLIF(conversions, 0), 2) AS avg_order_value,
  ROUND(refunds_or_failed_deliveries::numeric / NULLIF(conversions, 0) * 100, 2) AS refund_rate_pct
FROM conversion_base
ORDER BY price_tier, week_start DESC;

-- 3. Churn and offer fatigue monitoring.
WITH churn_events AS (
  SELECT
    ev.customer_id,
    ev.event_timestamp,
    ev.event_type,
    o.offer_id,
    o.campaign_name,
    o.offer_start,
    o.offer_end
  FROM crm.events ev
  LEFT JOIN campaign_calendar.offers o
    ON ev.details ->> 'promo_code' = o.promo_code
  WHERE ev.event_type IN ('subscription_cancelled', 'refund_processed')
    AND ev.event_timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
),
offer_touchpoints AS (
  SELECT
    customer_id,
    offer_id,
    campaign_name,
    MIN(event_timestamp) AS first_touch
  FROM churn_events
  GROUP BY customer_id, offer_id, campaign_name
),
offer_fatigue AS (
  SELECT
    customer_id,
    COUNT(DISTINCT offer_id) AS offers_this_month,
    COUNT(DISTINCT CASE WHEN event_timestamp >= CURRENT_TIMESTAMP - INTERVAL '14 days' THEN offer_id END) AS recent_offers
  FROM campaign_calendar.offer_engagements
  WHERE engagement_timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
  GROUP BY customer_id
)
SELECT
  ce.customer_id,
  ce.campaign_name,
  ce.offer_id,
  ce.event_type,
  ce.event_timestamp,
  OF.offers_this_month,
  OF.recent_offers,
  CASE WHEN OF.recent_offers >= 3 THEN TRUE ELSE FALSE END AS fatigue_flag
FROM offer_touchpoints ce
LEFT JOIN offer_fatigue OF ON OF.customer_id = ce.customer_id
WHERE ce.event_timestamp <= ce.offer_end + INTERVAL '48 hours'
ORDER BY fatigue_flag DESC, ce.event_timestamp DESC;

-- 4. Revenue vs forecast performance (by merchant tier + campaign).
WITH daily_actuals AS (
  SELECT
    revenue_date,
    merchant_tier,
    COALESCE(campaign_tag, 'organic') AS campaign_tag,
    SUM(actual_revenue) AS actual_revenue,
    SUM(order_count) AS total_orders
  FROM metrics.daily_revenue
  WHERE revenue_date >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '4 weeks')
  GROUP BY revenue_date, merchant_tier, campaign_tag
),
forecast AS (
  SELECT
    forecast_date,
    merchant_tier,
    COALESCE(campaign_tag, 'organic') AS campaign_tag,
    target_revenue,
    target_orders
  FROM metrics.forecasts
  WHERE forecast_date >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '4 weeks')
)
SELECT
  f.forecast_date,
  f.merchant_tier,
  f.campaign_tag,
  f.target_revenue,
  f.target_orders,
  COALESCE(d.actual_revenue, 0) AS actual_revenue,
  COALESCE(d.total_orders, 0) AS actual_orders,
  ROUND(COALESCE(NULLIF(d.actual_revenue, 0), 0) / NULLIF(f.target_revenue, 0) * 100, 2) AS revenue_vs_target_pct,
  ROUND(COALESCE(NULLIF(d.total_orders, 0), 0) / NULLIF(f.target_orders, 0) * 100, 2) AS orders_vs_target_pct
FROM forecast f
LEFT JOIN daily_actuals d
  ON d.revenue_date = f.forecast_date
 AND d.merchant_tier = f.merchant_tier
 AND d.campaign_tag = f.campaign_tag
ORDER BY f.forecast_date DESC, f.merchant_tier, f.campaign_tag;

-- Reporter template helper: collect the four KPI tables into a single view for consumption.
WITH kpi_alerts AS (
  SELECT
    'price_gap' AS signal,
    city || ' | ' || cuisine || ' | ' || item_name AS context,
    CONCAT('Gap ', gap_pct::TEXT, '% (our ', our_price::TEXT, ' vs comp ', avg_competitor_price::TEXT, ')') AS detail,
    price_hour AS observed_at
  FROM price_gap
  WHERE gap_pct >= 5
  LIMIT 5
)
SELECT * FROM kpi_alerts;
