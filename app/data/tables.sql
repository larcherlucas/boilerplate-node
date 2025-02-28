-- Suppression des tables existantes si elles existent
DROP TABLE IF EXISTS recipe_reviews CASCADE;
DROP TABLE IF EXISTS dietary_restrictions CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS menus CASCADE;
DROP TABLE IF EXISTS seasonal_items CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS weekly_menus CASCADE;
DROP TYPE IF EXISTS MEAL_TYPE CASCADE;
DROP TYPE IF EXISTS DIFFICULTY_LEVEL CASCADE;
DROP TYPE IF EXISTS SEASON CASCADE;
DROP TYPE IF EXISTS USER_ROLE CASCADE;
DROP TYPE IF EXISTS MENU_TYPE CASCADE;
DROP TYPE IF EXISTS MENU_STATUS CASCADE;
DROP TYPE IF EXISTS SUBSCRIPTION_STATUS CASCADE;

-- Création des types énumérés
CREATE TYPE MEAL_TYPE AS ENUM ('breakfast', 'lunch', 'dinner', 'snack', 'dessert');
CREATE TYPE DIFFICULTY_LEVEL AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE SEASON AS ENUM ('spring', 'summer', 'autumn', 'winter', 'all');
CREATE TYPE USER_ROLE AS ENUM ('admin', 'user', 'premium');
CREATE TYPE MENU_TYPE AS ENUM ('weekly', 'monthly');
CREATE TYPE MENU_STATUS AS ENUM ('active', 'archived', 'draft');
CREATE TYPE SUBSCRIPTION_STATUS AS ENUM ('active', 'cancelled', 'expired', 'pending');

-- Table des utilisateurs
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL, 
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role USER_ROLE NOT NULL DEFAULT 'user',
    google_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255) UNIQUE,
    household_members JSONB NOT NULL DEFAULT '{
        "adults": 0,
        "children_over_3": 0,
        "children_under_3": 0,
        "babies": 0
    }',
    preferences JSONB NOT NULL DEFAULT '{}',
    billing_info JSONB NOT NULL DEFAULT '{}',
    subscription_type VARCHAR(50),
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    subscription_status SUBSCRIPTION_STATUS,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Table des recettes
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    origin VARCHAR(50),
    prep_time INTEGER CHECK (prep_time > 0),
    difficulty_level DIFFICULTY_LEVEL NOT NULL,
    meal_type MEAL_TYPE NOT NULL,
    season SEASON NOT NULL DEFAULT 'all',
    is_premium BOOLEAN NOT NULL DEFAULT false,
    ingredients JSONB NOT NULL,
    steps JSONB NOT NULL,
    nutrition_info JSONB NOT NULL DEFAULT '{}',
    servings INTEGER NOT NULL DEFAULT 4 CHECK (servings > 0),
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    image_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table des produits de saison
CREATE TABLE seasonal_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('vegetable', 'fruit')),
    seasons JSONB NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    nutritional_benefits TEXT,
    storage_tips TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, type)
);

-- Table des menus hebdomadaires
-- Remplaçant la table "menus" par "weekly_menus" pour correspondre aux routes
CREATE TABLE weekly_menus (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_schedule JSONB NOT NULL,
    status MENU_STATUS NOT NULL DEFAULT 'active',
    is_customized BOOLEAN NOT NULL DEFAULT false,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT valid_date_range CHECK (valid_to > valid_from)
);

-- Table des favoris
CREATE TABLE favorites (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, recipe_id)
);

-- Table des restrictions alimentaires
CREATE TABLE dietary_restrictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restriction_type VARCHAR(50) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, restriction_type)
);

-- Table des avis sur les recettes
CREATE TABLE recipe_reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, recipe_id)
);

-- Ajout de la table payments
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_invoice_id VARCHAR(255) UNIQUE,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('subscription', 'one_time')),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table public_info pour la route GET /public-info
CREATE TABLE public_info (
    id SERIAL PRIMARY KEY,
    landing_page_content JSONB NOT NULL DEFAULT '{}',
    features JSONB NOT NULL DEFAULT '[]',
    subscription_plans JSONB NOT NULL DEFAULT '[]',
    faqs JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seasonal_items_updated_at
    BEFORE UPDATE ON seasonal_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_reviews_updated_at
    BEFORE UPDATE ON recipe_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_menus_updated_at
    BEFORE UPDATE ON weekly_menus
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_info_updated_at
    BEFORE UPDATE ON public_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Création d'index
CREATE INDEX idx_recipes_meal_type ON recipes(meal_type);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty_level);
CREATE INDEX idx_recipes_season ON recipes(season);
CREATE INDEX idx_recipes_is_premium ON recipes(is_premium);
CREATE INDEX idx_recipes_author ON recipes(author_id);
CREATE INDEX idx_weekly_menus_user ON weekly_menus(user_id);
CREATE INDEX idx_weekly_menus_status ON weekly_menus(status);
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_recipe ON favorites(recipe_id);
CREATE INDEX idx_dietary_restrictions_user ON dietary_restrictions(user_id);
CREATE INDEX idx_recipe_reviews_recipe ON recipe_reviews(recipe_id);
CREATE INDEX idx_recipe_reviews_user ON recipe_reviews(user_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);