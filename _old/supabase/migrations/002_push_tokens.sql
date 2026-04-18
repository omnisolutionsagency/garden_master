-- Push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL,          -- 'ios', 'android', 'web'
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tokens" ON push_tokens
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
