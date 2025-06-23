
-- Create tables for Sound Pix application

-- Users table (handled by Supabase Auth)

-- User folders table
CREATE TABLE user_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User images table
CREATE TABLE user_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES user_folders(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  prompt TEXT,
  image_type TEXT CHECK (image_type IN ('regular', 'character', 'story', 'video_thumbnail')),
  original_image_id UUID REFERENCES user_images(id), -- For modified images
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User videos table
CREATE TABLE user_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES user_folders(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  prompt TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User stories table
CREATE TABLE user_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  full_story TEXT,
  segments JSONB, -- Array of story segments
  images JSONB, -- Array of generated image URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User characters table
CREATE TABLE user_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE user_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_characters ENABLE ROW LEVEL SECURITY;

-- Create policies for user_folders
CREATE POLICY "Users can view own folders" ON user_folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders" ON user_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON user_folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON user_folders
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for user_images
CREATE POLICY "Users can view own images" ON user_images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON user_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images" ON user_images
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON user_images
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for user_videos
CREATE POLICY "Users can view own videos" ON user_videos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own videos" ON user_videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos" ON user_videos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos" ON user_videos
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for user_stories
CREATE POLICY "Users can view own stories" ON user_stories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stories" ON user_stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories" ON user_stories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON user_stories
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for user_characters
CREATE POLICY "Users can view own characters" ON user_characters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own characters" ON user_characters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own characters" ON user_characters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own characters" ON user_characters
  FOR DELETE USING (auth.uid() = user_id);

-- Create functions to update folder image counts
CREATE OR REPLACE FUNCTION update_folder_image_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_folders 
    SET image_count = image_count + 1,
        updated_at = NOW()
    WHERE id = NEW.folder_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_folders 
    SET image_count = image_count - 1,
        updated_at = NOW()
    WHERE id = OLD.folder_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_folder_image_count
  AFTER INSERT OR DELETE ON user_images
  FOR EACH ROW EXECUTE FUNCTION update_folder_image_count();
