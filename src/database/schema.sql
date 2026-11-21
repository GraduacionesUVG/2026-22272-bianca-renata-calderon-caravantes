-- =========================================
-- Gymify Database SChema
-- Universidad del Valle de Guatemala
-- Trabajo Profesional
-- 
-- Autor: 
-- Bianca Calderón, 22272
--
-- Base de datos para la aplicación Gymify, que permite a los usuarios crear rutinas de ejercicio y llevar un registro de su progreso.
-- PostgreSQL 17
-- =========================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- nos permite usar UUID automaticamente


CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- user, admin, moderator
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT,
    profile_picture VARCHAR(255), --avatar.png
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0, 
    streak INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_email
    CHECK(length(trim(email)) > 0),

    CONSTRAINT chk_full_name
    CHECK(length(trim(full_name)) > 0),

    CONSTRAINT chk_username
    CHECK(length(trim(username)) >= 3),

    CONSTRAINT chk_level
    CHECK(level >= 1),

    CONSTRAINT chk_xp
    CHECK(xp >= 0),

    CONSTRAINT chk_streak
    CHECK(streak >= 0),

    CONSTRAINT chk_role
    CHECK (
        role IN (
            'user',
            'coach',
            'nutritionist',
            'admin'
        )
    )
);

CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    muscle_group VARCHAR(50) NOT NULL,
    equipment VARCHAR(50),
    difficulty VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_exercise_name
    CHECK(length(trim(name)) > 0),

    CONSTRAINT chk_difficulty
    CHECK(
        difficulty IN (
            'beginner',
            'intermediate',
            'advanced'
        )
    ),

    CONSTRAINT chk_muscle_group
    CHECK(
        muscle_group IN(
            'chest',
            'back',
            'legs',
            'shoulders',
            'arms',
            'core',
            'full_body',
            'cardio'
        )
    )
);

CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(100) NOT NULL,
    workout_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INTEGER NOT NULL,
    calories_burned INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_activity_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_duration
        CHECK (duration_minutes > 0),

    CONSTRAINT chk_calories
        CHECK (calories_burned >= 0),

    CONSTRAINT chk_title
    CHECK(length(trim(title)) > 0)
);

CREATE TABLE workout_exercises (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL,
    exercise_id UUID NOT NULL,
    sets INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight DECIMAL(5,2),
    duration_seconds INTEGER,
    order_number INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_workout
        FOREIGN KEY(workout_id)
        REFERENCES workouts(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_exercise
        FOREIGN KEY(exercise_id)
        REFERENCES exercises(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_sets
        CHECK(sets > 0),

    CONSTRAINT chk_reps
        CHECK(reps > 0),

    CONSTRAINT chk_weight
        CHECK(weight IS NULL OR weight >= 0),

    CONSTRAINT chk_order
        CHECK(order_number > 0),

    CONSTRAINT unique_order
    UNIQUE(workout_id, order_number)

);

CREATE TABLE achievements ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    title VARCHAR(100) UNIQUE NOT NULL, 
    description TEXT, 
    xp_reward INTEGER NOT NULL,
    icon VARCHAR(100), 
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 

    CONSTRAINT chk_achievement_title
    CHECK(length(trim(title)) > 0),

    CONSTRAINT chk_xp_reward
    CHECK(xp_reward >= 0)
);

CREATE TABLE user_achievements (

    user_id UUID NOT NULL,

    achievement_id UUID NOT NULL,

    unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, achievement_id),

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (achievement_id)
        REFERENCES achievements(id)
        ON DELETE CASCADE
);

CREATE TABLE posts (
    
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    achievement_id UUID NULL,
    content TEXT NOT NULL,
    post_type VARCHAR(20) NOT NULL, -- training, questions, achievement, general
    edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_post_type
    CHECK(
        post_type IN (
            'training',
            'question',
            'achievement',
            'general'
        )
    ),
    CONSTRAINT fk_post_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_post_achievement
    FOREIGN KEY (achievement_id)
    REFERENCES achievements(id) ON DELETE SET NULL,

    CONSTRAINT chk_content
    CHECK(length(trim(content)) > 0)
);

CREATE UNIQUE INDEX unique_shared_achievement
ON posts(user_id, achievement_id)
WHERE achievement_id IS NOT NULL;

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_comment_post
        FOREIGN KEY (post_id)
        REFERENCES posts(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comment_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_comment
        CHECK (length(trim(content)) > 0)
);

create table likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_like_post 
    FOREIGN KEY (post_id) 
    REFERENCES posts(id) ON DELETE CASCADE,

    CONSTRAINT fk_like_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT unique_like
    UNIQUE(post_id,user_id)
);

CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    goal INTEGER NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    xp_reward INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_challenge_title
    CHECK(length(trim(title)) > 0),

    CONSTRAINT chk_goal
    CHECK(goal > 0),

    CONSTRAINT chk_dates
    CHECK(start_date < end_date),

    CONSTRAINT chk_challenge_xp
    CHECK(xp_reward >= 0)
);

CREATE TABLE challenges_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    progress INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE, 

    CONSTRAINT chk_progress
    CHECK(progress >= 0),

    CONSTRAINT unique_participant
    UNIQUE(challenge_id,user_id),

    CONSTRAINT fk_challenge_participant
    FOREIGN KEY (challenge_id)
    REFERENCES challenges(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_user_participant
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE

);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_notification_title
    CHECK(length(trim(title)) > 0),

    CONSTRAINT chk_notification_message
    CHECK(length(trim(message)) > 0),

    CONSTRAINT fk_notification_user
    FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE

);

CREATE INDEX idx_posts_user
ON posts(user_id);

CREATE INDEX idx_comments_post
ON comments(post_id);

CREATE INDEX idx_likes_post
ON likes(post_id);

CREATE INDEX idx_workouts_user
ON workouts(user_id);

CREATE INDEX idx_notifications_user
ON notifications(user_id);

CREATE INDEX idx_challenge_user
ON challenges_participants(user_id);

CREATE INDEX idx_posts_created
ON posts(created_at DESC);

CREATE INDEX idx_workout_exercises_workout
ON workout_exercises(workout_id);

CREATE INDEX idx_workout_exercises_exercise
ON workout_exercises(exercise_id);
