-- add store

-- Auto-update updatedAt on row changes.
create or replace function touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

create type userRole as enum ('user', 'admin');

create table users (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  email text not null unique,
  name text not null,
  passwordHash text not null,
  role userRole not null default 'user'
);

create trigger usersTouchUpdatedAt
  before update on users
  for each row execute function touchUpdatedAt();

create table products (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  slug text not null unique,
  title text not null,
  description text not null,
  priceCents integer not null check (priceCents >= 50),
  coverType text not null,
  coverData bytea not null,
  coverHash text generated always as (encode(sha256(coverData), 'hex')) stored,
  fileName text not null,
  fileType text not null check (fileType in ('application/pdf', 'application/zip')),
  fileSize integer not null,
  fileData bytea not null
);

create trigger productsTouchUpdatedAt
  before update on products
  for each row execute function touchUpdatedAt();

-- One product per order. The buyer is an email, never an account.
create table orders (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  email text not null,
  productId uuid not null references products (id),
  amountCents integer not null,
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending', 'paid')),
  stripeSessionId text unique,
  paidAt timestamptz,

  -- The download link. Reissuing it (a resend) mints a new token and resets
  -- the count and the expiry, so the old link stops working.
  downloadToken text not null unique default encode(gen_random_bytes(24), 'hex'),
  downloadCount integer not null default 0,
  expiresAt timestamptz
);

create index ordersEmailIdx on orders (email);
create index ordersPaidAtIdx on orders (paidAt desc);

create trigger ordersTouchUpdatedAt
  before update on orders
  for each row execute function touchUpdatedAt();

-- Every download that was served, for the per-product counts. Reissuing a link
-- resets orders.downloadCount but never touches this.
create table downloads (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  orderId uuid not null references orders (id) on delete cascade
);

create index downloadsOrderIdx on downloads (orderId);

create trigger downloadsTouchUpdatedAt
  before update on downloads
  for each row execute function touchUpdatedAt();

-- One library link per buyer email, printed in every download email.
create table libraries (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  email text not null unique,
  token text not null unique default encode(gen_random_bytes(24), 'hex')
);

create trigger librariesTouchUpdatedAt
  before update on libraries
  for each row execute function touchUpdatedAt();

-- One Stripe webhook endpoint per url the app has served from in production.
-- The app registers it on the first checkout and keeps the signing secret.
create table stripeWebhooks (
  url text primary key,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  endpointId text not null,
  secret text not null
);

create trigger stripeWebhooksTouchUpdatedAt
  before update on stripeWebhooks
  for each row execute function touchUpdatedAt();
