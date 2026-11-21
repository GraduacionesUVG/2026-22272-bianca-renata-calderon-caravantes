ALTER TABLE posts
ADD COLUMN achievement_id UUID NULL;

ALTER TABLE posts
ADD CONSTRAINT fk_post_achievement
FOREIGN KEY (achievement_id)
REFERENCES achievements(id)
ON DELETE SET NULL;

CREATE UNIQUE INDEX unique_shared_achievement
ON posts(user_id, achievement_id)
WHERE achievement_id IS NOT NULL;