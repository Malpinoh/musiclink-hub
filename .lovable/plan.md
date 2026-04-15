### MDistro — Campaign Dashboard, Templates System, and Logo/Favicon Update

## Overview

Implement three major upgrades to strengthen MDistro Link as a professional marketing platform for independent artists:

1. Campaign Performance Dashboard
2. Campaign Templates System (guided campaign creation)
3. Logo and Favicon Branding Update

These upgrades align with the core workflow used by modern music marketing platforms such as [Feature.fm](http://Feature.fm) and ToneDen, where artists launch campaigns, monitor performance, and iterate quickly.

---

# Part A — Logo and Favicon Update

## Objective

Update the visual branding of MDistro Link using the new logo across the application and browser environments.

---

## Files

Replace existing assets:

```
src/assets/logo.png
public/favicon.png
public/favicon.ico
```

---

## Steps

1.   
Copy uploaded image:  


```
MDISTRO_LINK.png
```

To:

```
src/assets/logo.png
public/favicon.png
```

---

2.   
Generate favicon file:  


```
public/favicon.ico
```

Recommended sizes:

```
16x16
32x32
48x48
64x64
```

---

3.   
Update favicon references:  


File:

```
index.html
```

Ensure:

```
<link rel="icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/favicon.png" />
```

---

4.   
Update components using logo  


Check and update:

```
Header.tsx
LoadingScreen.tsx
AuthLayout.tsx
Sidebar.tsx
```

---

# Part B — Campaign Performance Dashboard

## Objective

Provide artists with a real-time marketing performance dashboard showing campaign results and trends.

---

## Route

```
/artist/campaigns
```

---

## Data Sources

Existing tables:

```
fanlinks
pre_saves
pre_save_actions
clicks
fan_contacts
```

No new core tables required.

---

# Dashboard Features

## Stat Cards

Display:

```
Total Clicks
Fans Collected
Pre-saves
Conversion Rate
Top Platform
Top Country
```

---

## Conversion Rate Formula

```
Conversion Rate = Fans ÷ Clicks × 100
```

---

## Layout

Responsive grid:

```
Mobile: 1 column
Tablet: 2 columns
Desktop: 4 columns
```

---

## New Files

```
src/pages/CampaignDashboard.tsx
src/components/DateRangeFilter.tsx
src/components/PerformanceChart.tsx
src/components/CampaignTable.tsx
src/components/TopPlatformsCard.tsx
src/components/TopCountriesCard.tsx
src/components/CampaignDashboardSkeleton.tsx
```

---

## Date Range Filter

Options:

```
Last 7 days
Last 30 days
Last 90 days
All Time
Custom Range
```

---

## Performance Chart

Display:

```
Clicks per day
Fans per day
Pre-saves per day
```

Chart Type:

```
Line chart
```

---

## Campaign Table

Columns:

```
Campaign
Clicks
Fans
Pre-saves
Conversion Rate
Created Date
Status
```

Features:

```
Sortable
Paginated
Mobile scroll
```

---

## Export Report

Add button:

```
Export CSV
```

Export fields:

```
Campaign
Clicks
Fans
Pre-saves
Conversion Rate
Date
```

---

## Analytics Tracking

Trigger:

```
trackEvent("campaign_dashboard_viewed")
```

---

# Performance Safeguards

Add database indexes:

```
CREATE INDEX idx_clicks_link_id
ON clicks(link_id);

CREATE INDEX idx_contacts_link_id
ON fan_contacts(link_id);
```

---

# Part C — Campaign Templates System

## Objective

Allow artists to create structured marketing campaigns using guided templates.

---

## Routes

```
/artist/campaigns/create
/artist/campaigns/list
```

---

# Database Migration

## Table — campaign_templates

Reference templates.

```
CREATE TABLE campaign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,

  description text,

  template_type text NOT NULL,

  default_settings jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now()
);
```

---

Enable RLS:

```
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;
```

Policy:

```
CREATE POLICY "Anyone can view templates"
ON campaign_templates
FOR SELECT
USING (true);
```

---

## Table — campaigns

User campaigns.

```
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL,

  template_id uuid REFERENCES campaign_templates(id),

  campaign_name text NOT NULL,

  artist_name text,

  release_date timestamptz,

  artwork_url text,

  status text DEFAULT 'draft',

  fanlink_id uuid,

  pre_save_id uuid,

  created_at timestamptz DEFAULT now()
);
```

---

Enable RLS:

```
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
```

Policy:

```
CREATE POLICY "Users manage own campaigns"
ON campaigns
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

# Default Campaign Templates

Insert:

```
New Song Release
Music Video Launch
Album Launch
Concert Promotion
```

---

# Template Workflow

## Step 1 — Select Template

Display cards:

```
New Song Release
Music Video Launch
Album Launch
Concert Promotion
```

---

## Step 2 — Enter Details

Fields:

```
Campaign Name
Artist Name
Release Date
Artwork Upload
Description
```

---

## Step 3 — Auto Generate Assets

System automatically creates:

```
Fanlink
Pre-save
Countdown
Fan collection
Tracking
```

---

## Step 4 — Confirmation Screen

Display:

```
Campaign Timeline
Recommendations
Share options
```

---

# New Files

```
src/pages/CreateCampaign.tsx
src/pages/CampaignList.tsx
src/components/CampaignTemplateCard.tsx
src/components/CampaignTimeline.tsx
```

---

# Modified Files

```
src/App.tsx
src/pages/Dashboard.tsx
src/components/Header.tsx
index.html
```

---

# Mobile Responsiveness Requirements

Mandatory rules:

```
Minimum touch size: 48px
Full-width buttons
Scrollable tables
Responsive charts
Stacked layout on mobile
```

---

# Success Criteria

System is considered complete when:

```
Artist can create campaign in under 60 seconds
Dashboard loads in under 2 seconds
Charts render correctly on mobile
CSV export works
Campaign assets generate automatically
```