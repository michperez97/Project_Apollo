-- Create module_items table
CREATE TABLE IF NOT EXISTS module_items (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'file', 'link', 'video')),
  title VARCHAR(255) NOT NULL,
  content TEXT,  -- Can store text content, file URL, or external link
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_module_items_module_id ON module_items(module_id);
CREATE INDEX idx_module_items_position ON module_items(module_id, position);
