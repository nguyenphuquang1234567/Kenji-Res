-- Add new columns to conversations table for customer analysis
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_industry TEXT,
-- (Deprecated) previously added columns retained for backward compat in older envs
ADD COLUMN IF NOT EXISTS lead_quality TEXT CHECK (lead_quality IN ('good', 'ok', 'spam')),
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_lead_quality ON conversations(lead_quality);
CREATE INDEX IF NOT EXISTS idx_conversations_analyzed_at ON conversations(analyzed_at);

-- Add comments to document the new columns
COMMENT ON COLUMN conversations.customer_name IS 'Customer name extracted from conversation';
COMMENT ON COLUMN conversations.customer_email IS 'Customer email address extracted from conversation';
COMMENT ON COLUMN conversations.customer_phone IS 'Customer phone number extracted from conversation';
COMMENT ON COLUMN conversations.customer_industry IS 'Customer industry extracted from conversation';
-- Remove old comments for deprecated fields
COMMENT ON COLUMN conversations.lead_quality IS 'Lead quality assessment: good, ok, or spam';
COMMENT ON COLUMN conversations.analyzed_at IS 'Timestamp when conversation was analyzed'; 

-- Rename table and indexes to `restaurant` (idempotent)
ALTER TABLE IF EXISTS conversations RENAME TO restaurant;

-- If indexes existed with old names, rename them to new names
ALTER INDEX IF EXISTS idx_conversations_lead_quality RENAME TO idx_restaurant_lead_quality;
ALTER INDEX IF EXISTS idx_conversations_analyzed_at RENAME TO idx_restaurant_analyzed_at;

-- Ensure indexes exist on the new table
CREATE INDEX IF NOT EXISTS idx_restaurant_lead_quality ON restaurant(lead_quality);
CREATE INDEX IF NOT EXISTS idx_restaurant_analyzed_at ON restaurant(analyzed_at);

-- Update comments to reference the new table name
COMMENT ON COLUMN restaurant.customer_name IS 'Customer name extracted from conversation';
COMMENT ON COLUMN restaurant.customer_email IS 'Customer email address extracted from conversation';
COMMENT ON COLUMN restaurant.customer_phone IS 'Customer phone number extracted from conversation';
COMMENT ON COLUMN restaurant.customer_industry IS 'Customer industry extracted from conversation';

-- Rename column customer_industry -> order_time (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurant' AND column_name = 'customer_industry'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurant' AND column_name = 'order_time'
  ) THEN
    ALTER TABLE restaurant RENAME COLUMN customer_industry TO order_time;
  END IF;
END $$;

-- Optional: adjust comment for new column
COMMENT ON COLUMN restaurant.order_time IS 'Requested order time extracted from conversation';
-- Add customer_address if missing
ALTER TABLE IF EXISTS restaurant ADD COLUMN IF NOT EXISTS customer_address TEXT;
COMMENT ON COLUMN restaurant.customer_address IS 'Customer address extracted from conversation';
-- Drop deprecated columns if they exist
ALTER TABLE IF EXISTS restaurant DROP COLUMN IF EXISTS customer_problem;
ALTER TABLE IF EXISTS restaurant DROP COLUMN IF EXISTS customer_availability;
ALTER TABLE IF EXISTS restaurant DROP COLUMN IF EXISTS customer_consultation;

-- Drop special_notes column if it exists (migrate away from this field)
ALTER TABLE IF EXISTS restaurant DROP COLUMN IF EXISTS special_notes;
COMMENT ON COLUMN restaurant.lead_quality IS 'Lead quality assessment: good, ok, or spam';
COMMENT ON COLUMN restaurant.analyzed_at IS 'Timestamp when conversation was analyzed';