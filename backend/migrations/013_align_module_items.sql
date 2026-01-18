-- Align module_items schema to match current code expectations
ALTER TABLE module_items
  ADD COLUMN IF NOT EXISTS content_url TEXT,
  ADD COLUMN IF NOT EXISTS content_text TEXT;

-- Backfill: split existing content into content_text when type is text; otherwise into content_url
UPDATE module_items
SET content_text = CASE WHEN type = 'text' THEN content ELSE NULL END,
    content_url = CASE WHEN type <> 'text' THEN content ELSE NULL END
WHERE content IS NOT NULL;

-- Drop legacy content column if present
ALTER TABLE module_items
  DROP COLUMN IF EXISTS content;

-- Normalize type options to code-supported set
ALTER TABLE module_items
  DROP CONSTRAINT IF EXISTS module_items_type_check;

ALTER TABLE module_items
  ADD CONSTRAINT module_items_type_check CHECK (type IN ('text', 'link', 'file'));

-- Ensure position default matches code expectation (1-based ordering)
ALTER TABLE module_items
  ALTER COLUMN position SET DEFAULT 1;

