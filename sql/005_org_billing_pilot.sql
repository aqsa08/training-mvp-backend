alter table organizations
  add column pilot_paid boolean default false,
  add column pilot_amount_cents integer,
  add column pilot_paid_at timestamptz,
  add column subscription_started_at timestamptz,
  add column price_locked_until timestamptz,
  add column founding_partner boolean default false;