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
-- Recreate special_notes for storing customer notes, if missing
ALTER TABLE IF EXISTS restaurant ADD COLUMN IF NOT EXISTS special_notes TEXT;
-- Add order_item column if missing
ALTER TABLE IF EXISTS restaurant ADD COLUMN IF NOT EXISTS order_item TEXT;
COMMENT ON COLUMN restaurant.order_item IS 'Items ordered by customer extracted from conversation';
COMMENT ON COLUMN restaurant.special_notes IS 'Special notes from customer';
COMMENT ON COLUMN restaurant.lead_quality IS 'Lead quality assessment: good, ok, or spam';
COMMENT ON COLUMN restaurant.analyzed_at IS 'Timestamp when conversation was analyzed';

-- RAG: enable pgvector and create documents table for knowledge store
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table stores chunked content and its embedding
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,         -- e.g., 'HOUSE INFO', 'MENU REFERENCE'
  section TEXT,                 -- optional subsection
  content TEXT NOT NULL,        -- raw chunk text
  embedding vector(3072),       -- text-embedding-3-large
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create vector index if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'documents_embedding_idx'
  ) THEN
    CREATE INDEX documents_embedding_idx ON public.documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  END IF;
END $$;

-- Similarity search helper
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(3072),
  match_count int DEFAULT 5
) RETURNS TABLE(id uuid, source text, section text, content text, similarity float) AS $$
  SELECT d.id, d.source, d.section, d.content,
         1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.documents d
  WHERE d.embedding IS NOT NULL
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE SQL STABLE;

-- Structured HOUSE INFO table
CREATE TABLE IF NOT EXISTS public.house_info (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Seed HOUSE INFO (idempotent upserts)
INSERT INTO public.house_info(key, value) VALUES
  ('brand', 'Kenji Shop (Contemporary Japanese dining)'),
  ('address', '123 Nguyen Hue, District 1, Ho Chi Minh City'),
  ('hotline', '1900 1234'),
  ('currency', 'USD')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Structured MENU items table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  price_usd numeric(10,2) NOT NULL,
  image_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed MENU items (idempotent upserts by name)
INSERT INTO public.menu_items(name, description, price_usd, image_path) VALUES
  ('Wagyu Steak', 'A5 Wagyu, yuzu kosho butter, black garlic glaze', 68.90, 'images/wagyu_steak.png'),
  ('Salmon Teriyaki', 'Pan-seared salmon, house teriyaki, shiso greens', 32.90, 'images/salmon_teriyaki.png'),
  ('Uni Truffle Udon', 'Fresh udon, uni cream, truffle aroma', 34.90, 'images/udon.png'),
  ('Seaweed Salad', 'Wakame, sesame dressing, toasted nori', 14.90, 'images/seaweed_salad.png'),
  ('Matcha Tiramisu', 'Mascarpone, sponge, ceremonial matcha', 12.90, 'images/matcha.png'),
  ('Tonkotsu Ramen', 'Rich pork broth, chashu, ajitama, nori', 21.90, 'images/tonkotsu_ramen.png'),
  ('Chicken Karaage', 'Crispy marinated chicken, lemon, yuzu mayo', 17.90, 'images/chicken.png'),
  ('Mochi Ice Cream', 'Soft mochi, vanilla gelato, kinako dust', 11.90, 'images/mochi_ice_cream.png')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price_usd = EXCLUDED.price_usd,
  image_path = EXCLUDED.image_path,
  updated_at = now();

-- Helpful view for tool consumption (flat key-value JSON for house info)
CREATE OR REPLACE VIEW public.house_info_json AS
SELECT jsonb_object_agg(key, value) AS info
FROM public.house_info;