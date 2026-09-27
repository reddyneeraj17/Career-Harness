CREATE TABLE `prime_vendors` (
  `vendor_norm` text PRIMARY KEY NOT NULL,
  `vendor_name` text NOT NULL,
  `portal_url` text,
  `tier` text,
  `category` text,
  `specialties` text,
  `engagement_types` text,
  `h1b_note` text,
  `last_refreshed` integer
);
