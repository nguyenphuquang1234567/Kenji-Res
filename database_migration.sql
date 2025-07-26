-- Add new columns to conversations table for customer analysis
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_industry TEXT,
ADD COLUMN IF NOT EXISTS customer_problem TEXT,
ADD COLUMN IF NOT EXISTS customer_availability TEXT,
ADD COLUMN IF NOT EXISTS customer_consultation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS special_notes TEXT,
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
COMMENT ON COLUMN conversations.customer_problem IS 'Customer problems and goals extracted from conversation';
COMMENT ON COLUMN conversations.customer_availability IS 'Customer availability extracted from conversation';
COMMENT ON COLUMN conversations.customer_consultation IS 'Whether customer has booked a consultation';
COMMENT ON COLUMN conversations.special_notes IS 'Special notes extracted from conversation';
COMMENT ON COLUMN conversations.lead_quality IS 'Lead quality assessment: good, ok, or spam';
COMMENT ON COLUMN conversations.analyzed_at IS 'Timestamp when conversation was analyzed'; 