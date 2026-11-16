create table if not exists public.tiktok_attributions (
  id uuid primary key default gen_random_uuid(),
  fanlink_id uuid not null references public.fanlinks(id) on delete cascade,
  click_id uuid null references public.clicks(id) on delete set null,
  platform_name text null,
  ttclid text null,
  campaign_id text null,
  campaign_name text null,
  adgroup_id text null,
  adgroup_name text null,
  ad_id text null,
  ad_name text null,
  utm_source text null,
  utm_medium text null,
  utm_content text null,
  utm_term text null,
  user_agent text null,
  device_type text null,
  country text null,
  city text null,
  created_at timestamptz not null default now()
);

create index if not exists tiktok_attributions_fanlink_created_idx
  on public.tiktok_attributions (fanlink_id, created_at desc);

create index if not exists tiktok_attributions_campaign_idx
  on public.tiktok_attributions (campaign_id, campaign_name);

create index if not exists tiktok_attributions_ttclid_idx
  on public.tiktok_attributions (ttclid);

alter table public.tiktok_attributions enable row level security;

drop policy if exists "Artists can read their own TikTok attributions" on public.tiktok_attributions;
create policy "Artists can read their own TikTok attributions"
on public.tiktok_attributions
for select
to authenticated
using (
  exists (
    select 1
    from public.fanlinks f
    where f.id = tiktok_attributions.fanlink_id
      and f.user_id = auth.uid()
  )
);

drop policy if exists "Service role manages TikTok attributions" on public.tiktok_attributions;
create policy "Service role manages TikTok attributions"
on public.tiktok_attributions
for all
to service_role
using (true)
with check (true);
