-- Suppression des tables existantes si elles existent
DROP TABLE IF EXISTS recipe_reviews CASCADE;
DROP TABLE IF EXISTS dietary_restrictions CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS weekly_menus CASCADE;
DROP TABLE IF EXISTS ingredients_seasonal CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS access_quotas CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

DROP VIEW IF EXISTS recipe_ratings CASCADE;
DROP VIEW IF EXISTS recipes_by_age CASCADE;
DROP VIEW IF EXISTS active_subscribers CASCADE;
DROP VIEW IF EXISTS recipes_frontend CASCADE;

DROP FUNCTION IF EXISTS update_recipe_rating() CASCADE;
DROP FUNCTION IF EXISTS validate_recipe_json() CASCADE;
DROP FUNCTION IF EXISTS normalize_recipe_json() CASCADE;
DROP FUNCTION IF EXISTS sync_subscription_fields() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_weekly_menu(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS can_access_premium_recipe(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_category_from_meal_type() CASCADE;
DROP FUNCTION IF EXISTS format_recipe_for_frontend(recipes) CASCADE;

-- Suppression des types énumérés s'ils existent
DROP TYPE IF EXISTS MEAL_TYPE CASCADE;
DROP TYPE IF EXISTS DIFFICULTY_LEVEL CASCADE;
DROP TYPE IF EXISTS SEASON CASCADE;
DROP TYPE IF EXISTS USER_ROLE CASCADE;
DROP TYPE IF EXISTS MENU_TYPE CASCADE;
DROP TYPE IF EXISTS MENU_STATUS CASCADE;
DROP TYPE IF EXISTS SUBSCRIPTION_STATUS CASCADE;
DROP TYPE IF EXISTS SUBSCRIPTION_TYPE CASCADE;
-- 1. Création du type ENUM pour les catégories d'âge
DROP TYPE IF EXISTS AGE_CATEGORY CASCADE;
CREATE TYPE AGE_CATEGORY AS ENUM (
    'toute la famille', 
    'bébé 6 à 9 mois', 
    'bébé 9 à 12 mois', 
    'bébé 12 à 18 mois', 
    'bébé 18 mois et +', 
    'enfant'
);
-- Création des types énumérés
CREATE TYPE MEAL_TYPE AS ENUM ('breakfast', 'lunch', 'dinner', 'snack', 'dessert');
CREATE TYPE DIFFICULTY_LEVEL AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE SEASON AS ENUM ('spring', 'summer', 'autumn', 'winter', 'all');
CREATE TYPE USER_ROLE AS ENUM ('admin', 'user', 'premium');
CREATE TYPE MENU_TYPE AS ENUM ('weekly', 'monthly');
CREATE TYPE MENU_STATUS AS ENUM ('active', 'archived', 'draft');
CREATE TYPE SUBSCRIPTION_STATUS AS ENUM ('active', 'cancelled', 'expired', 'pending', 'inactive');
CREATE TYPE SUBSCRIPTION_TYPE AS ENUM ('none', 'monthly', 'annual');

-- Table des utilisateurs avec champs explicites pour l'abonnement
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL, 
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role USER_ROLE NOT NULL DEFAULT 'user',
    google_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255) UNIQUE,
    household_members JSONB NOT NULL DEFAULT '{
        "adults": 1,
        "children_over_3": 0,
        "children_under_3": 0,
        "babies": 0
    }',
    preferences JSONB NOT NULL DEFAULT '{}',
    billing_info JSONB NOT NULL DEFAULT '{}',
    -- Colonnes explicites pour l'abonnement
    subscription_type SUBSCRIPTION_TYPE DEFAULT 'none',
    subscription_status SUBSCRIPTION_STATUS DEFAULT 'inactive',
    subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    subscription_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    -- Conservation du champ JSONB pour rétrocompatibilité avec le frontend
    subscription JSONB NOT NULL DEFAULT '{
        "type": "none",
        "isActive": false,
        "status": "inactive",
        "startDate": null,
        "endDate": null
    }',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_household_json CHECK (jsonb_typeof(household_members) = 'object')
);

COMMENT ON TABLE users IS 'Table des utilisateurs avec leurs préférences et informations d''abonnement';
COMMENT ON COLUMN users.household_members IS 'Composition du foyer pour adapter les portions';
COMMENT ON COLUMN users.subscription IS 'Détails de l''abonnement au format JSON (pour compatibilité frontend)';
COMMENT ON COLUMN users.subscription_type IS 'Type d''abonnement (none, monthly, annual)';
COMMENT ON COLUMN users.subscription_status IS 'Statut de l''abonnement (active, cancelled, expired, pending, inactive)';


-- Table des recettes avec nouvelle colonne category
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    origin VARCHAR(50),
    prep_time INTEGER CHECK (prep_time > 0),
    cook_time INTEGER CHECK (cook_time >= 0),
    difficulty_level DIFFICULTY_LEVEL NOT NULL,
    meal_type MEAL_TYPE NOT NULL,
    category VARCHAR(50), -- Nouvelle colonne pour le frontend
    season SEASON NOT NULL DEFAULT 'all',
    is_premium BOOLEAN NOT NULL DEFAULT true, -- Par défaut, les recettes sont premium
    premium_rank INTEGER, -- Rang pour prioriser l'affichage des recettes premium
    ingredients JSONB NOT NULL,
    steps JSONB NOT NULL,
    nutrition_info JSONB NOT NULL DEFAULT '{}',
    servings INTEGER NOT NULL DEFAULT 4 CHECK (servings > 0),
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    image_url VARCHAR(255),
    status VARCHAR(50) DEFAULT 'published',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- 2. Ajout de la colonne age_category à la table recipes
ALTER TABLE recipes ADD COLUMN age_category AGE_CATEGORY;

-- 3. Modification pour mieux gérer les origines
-- Création d'une table de référence pour les origines de recettes
CREATE TABLE recipe_origins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des valeurs de base
INSERT INTO recipe_origins (name) VALUES 
('français'),
('asiatique'),
('italien'),
('méditerranéen'),
('mexicain'),
('indien'),
('moyen-oriental'),
('autre');


-- 4. Créer un index sur la colonne age_category pour améliorer les performances
CREATE INDEX idx_recipes_age_category ON recipes(age_category);

-- 5. Mise à jour de la vue recipes_frontend pour inclure les nouveaux champs
DROP VIEW IF EXISTS recipes_frontend CASCADE;
CREATE VIEW recipes_frontend AS
SELECT 
    r.id,
    r.title,
    r.description,
    r.origin,
    r.prep_time,
    r.cook_time,
    r.difficulty_level,
    r.meal_type,
    r.category,
    r.age_category,
    r.season,
    r.is_premium,
    r.premium_rank,
    r.ingredients,
    r.steps,
    r.nutrition_info,
    r.servings,
    r.author_id,
    u.email as author_email,
    r.rating,
    r.image_url,
    r.status,
    r.created_at,
    r.updated_at,
    (SELECT COUNT(*) FROM favorites f WHERE f.recipe_id = r.id) as favorite_count,
    (SELECT AVG(rating) FROM recipe_reviews rr WHERE rr.recipe_id = r.id) as average_rating,
    (SELECT COUNT(*) FROM recipe_reviews rr WHERE rr.recipe_id = r.id) as review_count
FROM 
    recipes r
LEFT JOIN 
    users u ON r.author_id = u.id;

-- 6. Configuration de l'encodage UTF-8 pour éviter les problèmes avec les caractères spéciaux
SET client_encoding = 'UTF8';
COMMENT ON TABLE recipes IS 'Catalogue de recettes avec ingrédients, étapes et informations nutritionnelles';
COMMENT ON COLUMN recipes.ingredients IS 'Liste structurée des ingrédients au format JSON';
COMMENT ON COLUMN recipes.steps IS 'Etapes de preparation au format JSON';
COMMENT ON COLUMN recipes.is_premium IS 'Indique si la recette est accessible uniquement aux abonnés premium';
COMMENT ON COLUMN recipes.premium_rank IS 'Rang pour l''affichage prioritaire des recettes premium';
COMMENT ON COLUMN recipes.category IS 'Catégorie de la recette formatée pour le frontend (ex: Petit-déjeuner)';

-- Table des produits de saison
CREATE TABLE ingredients_seasonal (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('vegetable', 'fruit', 'herb')),
    seasons JSONB NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    nutritional_benefits TEXT,
    storage_tips TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, type)
);

COMMENT ON TABLE ingredients_seasonal IS 'Produits de saison (fruits et légumes) avec leurs périodes de disponibilité';
COMMENT ON COLUMN ingredients_seasonal.seasons IS 'Saisons durant lesquelles l''ingrédient est disponible';
COMMENT ON COLUMN ingredients_seasonal.type IS 'Type de produit (vegetable, fruit, herb)';

-- Table des menus hebdomadaires
CREATE TABLE weekly_menus (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_schedule JSONB NOT NULL,
    menu_type MENU_TYPE NOT NULL DEFAULT 'weekly',
    status MENU_STATUS NOT NULL DEFAULT 'active',
    is_customized BOOLEAN NOT NULL DEFAULT false,
    family_size INTEGER DEFAULT 1, -- Ajout de la taille du foyer pour le menu
    generated_options JSONB DEFAULT '{}', -- Options utilisées pour la génération
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT valid_date_range CHECK (valid_to > valid_from)
);

COMMENT ON TABLE weekly_menus IS 'Menus hebdomadaires générés pour les utilisateurs';
COMMENT ON COLUMN weekly_menus.meal_schedule IS 'Planning des repas organisé par jour et type de repas';
COMMENT ON COLUMN weekly_menus.menu_type IS 'Type de menu (hebdomadaire ou mensuel)';
COMMENT ON COLUMN weekly_menus.generated_options IS 'Options utilisées lors de la génération du menu';

-- Table des favoris
CREATE TABLE favorites (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, recipe_id)
);

COMMENT ON TABLE favorites IS 'Association entre utilisateurs et leurs recettes favorites';

-- Table des restrictions alimentaires
CREATE TABLE dietary_restrictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restriction_type VARCHAR(50) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, restriction_type)
);

COMMENT ON TABLE dietary_restrictions IS 'Restrictions alimentaires des utilisateurs (allergies, régimes spéciaux)';

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

COMMENT ON TABLE recipe_reviews IS 'Avis et notes des utilisateurs sur les recettes';

-- Table des paiements
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

COMMENT ON TABLE payments IS 'Historique des paiements effectués par les utilisateurs';
-- Fonction améliorée pour la recherche de recettes avec tous les nouveaux critères
CREATE OR REPLACE FUNCTION search_recipes(
    p_meal_type MEAL_TYPE DEFAULT NULL,
    p_age_category AGE_CATEGORY DEFAULT NULL,
    p_origin VARCHAR DEFAULT NULL,
    p_category VARCHAR DEFAULT NULL,
    p_season SEASON DEFAULT NULL,
    p_is_premium BOOLEAN DEFAULT NULL,
    p_difficulty_level DIFFICULTY_LEVEL DEFAULT NULL,
    p_search_term TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id INTEGER,
    title VARCHAR(255),
    description TEXT,
    origin VARCHAR(50),
    age_category AGE_CATEGORY,
    meal_type MEAL_TYPE,
    category VARCHAR(50),
    difficulty_level DIFFICULTY_LEVEL,
    prep_time INTEGER,
    cook_time INTEGER,
    is_premium BOOLEAN,
    rating DECIMAL(3,2),
    image_url VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.title,
        r.description,
        r.origin,
        r.age_category,
        r.meal_type,
        r.category,
        r.difficulty_level,
        r.prep_time,
        r.cook_time,
        r.is_premium,
        r.rating,
        r.image_url
    FROM recipes r
    WHERE 
        (p_meal_type IS NULL OR r.meal_type = p_meal_type) AND
        (p_age_category IS NULL OR r.age_category = p_age_category) AND
        (p_origin IS NULL OR r.origin = p_origin) AND
        (p_category IS NULL OR r.category = p_category) AND
        (p_season IS NULL OR r.season = p_season OR r.season = 'all') AND
        (p_is_premium IS NULL OR r.is_premium = p_is_premium) AND
        (p_difficulty_level IS NULL OR r.difficulty_level = p_difficulty_level) AND
        (p_search_term IS NULL OR 
         r.title ILIKE '%' || p_search_term || '%' OR 
         r.description ILIKE '%' || p_search_term || '%')
    ORDER BY r.is_premium DESC, r.rating DESC, r.id
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Vue pour grouper les recettes par origine
CREATE OR REPLACE VIEW recipes_by_origin AS
SELECT 
    origin,
    COUNT(*) as recipe_count,
    ARRAY_AGG(id) as recipe_ids
FROM 
    recipes
WHERE 
    origin IS NOT NULL
GROUP BY 
    origin;

-- Vue pour grouper les recettes par catégorie (Petit-déjeuner, Déjeuner, etc.)
CREATE OR REPLACE VIEW recipes_by_category AS
SELECT 
    category,
    COUNT(*) as recipe_count,
    ARRAY_AGG(id) as recipe_ids
FROM 
    recipes
WHERE 
    category IS NOT NULL
GROUP BY 
    category;
-- Table plans d'abonnement 
CREATE TABLE subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    price INTEGER NOT NULL CHECK (price >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    interval VARCHAR(20) NOT NULL CHECK (interval IN ('month', 'year')),
    subscription_type SUBSCRIPTION_TYPE NOT NULL,
    features JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    stripe_price_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE subscription_plans IS 'Plans d''abonnement disponibles dans l''application';

-- Table des quotas d'accès
CREATE TABLE access_quotas (
    id SERIAL PRIMARY KEY,
    user_type SUBSCRIPTION_TYPE NOT NULL,
    feature_name VARCHAR(50) NOT NULL,
    quota_limit INTEGER NOT NULL, -- -1 pour illimité
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_type, feature_name)
);

COMMENT ON TABLE access_quotas IS 'Quotas d''accès aux fonctionnalités selon le type d''abonnement';

-- Table app_settings
CREATE TABLE app_settings (
    id SERIAL PRIMARY KEY,
    landing_page_content JSONB NOT NULL DEFAULT '{}',
    features JSONB NOT NULL DEFAULT '[]',
    subscription_plans JSONB NOT NULL DEFAULT '[]',
    faqs JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE app_settings IS 'Paramètres et contenus publics de l''application';

-- Trigger function pour mettre à jour la colonne "updated_at"
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers pour mettre à jour automatiquement "updated_at"
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredients_seasonal_updated_at
    BEFORE UPDATE ON ingredients_seasonal
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

CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_access_quotas_updated_at
    BEFORE UPDATE ON access_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour maintenir la synchronisation entre les colonnes d'abonnement et le JSONB
CREATE OR REPLACE FUNCTION sync_subscription_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Synchroniser des colonnes individuelles vers JSON
    -- Le format JSON est adapté aux attentes du frontend
    NEW.subscription = jsonb_build_object(
        'type', NEW.subscription_type::text,
        'status', NEW.subscription_status::text,
        'isActive', NEW.subscription_status = 'active',
        'startDate', NEW.subscription_start_date,
        'endDate', NEW.subscription_end_date
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_subscription_fields_trigger
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION sync_subscription_fields();

-- Fonction pour normaliser le format JSON des recettes
CREATE OR REPLACE FUNCTION normalize_recipe_json()
RETURNS TRIGGER AS $$
BEGIN
    -- Normaliser les ingrédients
    IF jsonb_typeof(NEW.ingredients) = 'object' AND NEW.ingredients ? 'ingredients' THEN
        -- Si c'est l'ancien format, convertir en tableau simple
        NEW.ingredients = NEW.ingredients->'ingredients';
    END IF;
    
    -- Si ingrédients n'est pas un tableau, créer un tableau vide
    IF jsonb_typeof(NEW.ingredients) <> 'array' THEN
        NEW.ingredients = '[]'::jsonb;
    END IF;
    
    -- Normaliser les étapes
    IF jsonb_typeof(NEW.steps) = 'object' AND NEW.steps ? 'steps' THEN
        -- Si c'est l'ancien format avec une clé 'steps', le normaliser
        NEW.steps = jsonb_build_array(
            jsonb_build_object(
                'category', 'Préparation',
                'instructions', NEW.steps->'steps'
            )
        );
    ELSIF jsonb_typeof(NEW.steps) = 'array' AND 
          (jsonb_array_length(NEW.steps) = 0 OR 
           (jsonb_array_length(NEW.steps) > 0 AND jsonb_typeof(NEW.steps->0) <> 'object')) THEN
        -- Si c'est un tableau simple de chaînes, le convertir en format structuré
        NEW.steps = jsonb_build_array(
            jsonb_build_object(
                'category', 'Préparation',
                'instructions', NEW.steps
            )
        );
    ELSIF jsonb_typeof(NEW.steps) <> 'array' THEN
        -- Si steps n'est pas un tableau, créer un format standard
        NEW.steps = jsonb_build_array(
            jsonb_build_object(
                'category', 'Préparation',
                'instructions', '[]'::jsonb
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer cette normalisation avant l'insertion ou la mise à jour
CREATE TRIGGER normalize_recipe_json_trigger
BEFORE INSERT OR UPDATE ON recipes
FOR EACH ROW
EXECUTE FUNCTION normalize_recipe_json();

-- Fonction pour mettre à jour automatiquement la catégorie en fonction du type de repas
CREATE OR REPLACE FUNCTION update_category_from_meal_type()
RETURNS TRIGGER AS $$
BEGIN
    NEW.category = CASE
        WHEN NEW.meal_type = 'breakfast' THEN 'Petit-déjeuner'
        WHEN NEW.meal_type = 'lunch' THEN 'Déjeuner'
        WHEN NEW.meal_type = 'dinner' THEN 'Dîner'
        WHEN NEW.meal_type = 'snack' THEN 'En-cas'
        WHEN NEW.meal_type = 'dessert' THEN 'Dessert'
        ELSE 'Autre'
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_category_trigger
BEFORE INSERT OR UPDATE OF meal_type ON recipes
FOR EACH ROW
EXECUTE FUNCTION update_category_from_meal_type();

-- Fonction pour calculer la moyenne des notes d'une recette
CREATE OR REPLACE FUNCTION update_recipe_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE recipes
    SET rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM recipe_reviews
        WHERE recipe_id = NEW.recipe_id
    )
    WHERE id = NEW.recipe_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recipe_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON recipe_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_recipe_rating();

-- Fonction pour formater les recettes au format du frontend
CREATE OR REPLACE FUNCTION format_recipe_for_frontend(recipe recipes)
RETURNS jsonb AS $$
DECLARE
    formatted_recipe jsonb;
BEGIN
    -- Structurer les données selon les besoins du frontend
    formatted_recipe = jsonb_build_object(
        'id', recipe.id,
        'title', recipe.title,
        'description', recipe.description,
        'prep_time', recipe.prep_time,
        'cook_time', recipe.cook_time,
        'servings', recipe.servings,
        'difficulty_level', recipe.difficulty_level,
        'meal_type', recipe.meal_type,
        'category', recipe.category,
        'season', recipe.season,
        'is_premium', recipe.is_premium,
        'origin', recipe.origin,
        'ingredients', recipe.ingredients,
        'steps', recipe.steps,
        'nutrition_info', recipe.nutrition_info,
        'author_id', recipe.author_id,
        'rating', recipe.rating,
        'image_url', recipe.image_url,
        'status', recipe.status,
        'created_at', recipe.created_at,
        'updated_at', recipe.updated_at
    );
    
    RETURN formatted_recipe;
END;
$$ LANGUAGE plpgsql;

-- Ajout d'index pour améliorer les performances des requêtes fréquentes
CREATE INDEX idx_recipes_meal_type ON recipes(meal_type);
CREATE INDEX idx_recipes_difficulty_level ON recipes(difficulty_level);
CREATE INDEX idx_recipes_season ON recipes(season);
CREATE INDEX idx_recipes_is_premium ON recipes(is_premium);
CREATE INDEX idx_recipes_premium_rank ON recipes(premium_rank) WHERE is_premium = true;
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_weekly_menus_user_id ON weekly_menus(user_id);
CREATE INDEX idx_weekly_menus_status ON weekly_menus(status);
CREATE INDEX idx_ingredients_seasonal_seasons ON ingredients_seasonal USING GIN (seasons);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_subscription_type ON users(subscription_type);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_recipe_id ON favorites(recipe_id);
CREATE INDEX idx_dietary_restrictions_user_id ON dietary_restrictions(user_id);
CREATE INDEX idx_recipe_reviews_recipe_id ON recipe_reviews(recipe_id);
CREATE INDEX idx_recipe_reviews_user_id ON recipe_reviews(user_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_subscription_plans_subscription_type ON subscription_plans(subscription_type);
CREATE INDEX idx_subscription_plans_is_active ON subscription_plans(is_active);

-- Vue pour les recettes avec leurs notes moyennes et nombre d'avis
CREATE VIEW recipe_ratings AS
SELECT r.id, r.title, r.rating, COUNT(rr.id) AS review_count
FROM recipes r
LEFT JOIN recipe_reviews rr ON r.id = rr.recipe_id
GROUP BY r.id, r.title, r.rating;

-- Vue pour les recettes adaptées par âge
CREATE VIEW recipes_by_age AS
SELECT 
    r.id, r.title, r.meal_type,
    CASE
        WHEN r.description LIKE '%under 3%' THEN 'under_3'
        ELSE 'all_ages'
    END AS age_group
FROM recipes r;

-- Vue pour les utilisateurs avec abonnement actif
CREATE VIEW active_subscribers AS
SELECT id, username, email, subscription_type, subscription_start_date, subscription_end_date
FROM users
WHERE subscription_status = 'active';

-- Vue qui combine toutes les données nécessaires pour le frontend
CREATE VIEW recipes_frontend AS
SELECT 
    r.id,
    r.title,
    r.description,
    r.origin,
    r.prep_time,
    r.cook_time,
    r.difficulty_level,
    r.meal_type,
    r.category,
    r.season,
    r.is_premium,
    r.premium_rank,
    r.ingredients,
    r.steps,
    r.nutrition_info,
    r.servings,
    r.author_id,
    u.email as author_email,
    r.rating,
    r.image_url,
    r.status,
    r.created_at,
    r.updated_at,
    (SELECT COUNT(*) FROM favorites f WHERE f.recipe_id = r.id) as favorite_count,
    (SELECT AVG(rating) FROM recipe_reviews rr WHERE rr.recipe_id = r.id) as average_rating,
    (SELECT COUNT(*) FROM recipe_reviews rr WHERE rr.recipe_id = r.id) as review_count
FROM 
    recipes r
LEFT JOIN 
    users u ON r.author_id = u.id;

-- Fonction pour générer un menu hebdomadaire basé sur les préférences
CREATE OR REPLACE FUNCTION generate_weekly_menu(user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    menu_id INTEGER;
    user_preferences JSONB;
    user_restrictions TEXT[];
BEGIN
    -- Récupérer les préférences et restrictions de l'utilisateur
    SELECT preferences INTO user_preferences FROM users WHERE id = user_id;
    
    SELECT array_agg(restriction_type) INTO user_restrictions 
    FROM dietary_restrictions 
    WHERE user_id = user_id;
    
    -- Création d'un menu basique
    INSERT INTO weekly_menus (
        user_id, 
        meal_schedule, 
        valid_from, 
        valid_to
    )
    VALUES (
        user_id,
        '{"monday": {"breakfast": null, "lunch": null, "dinner": null}, 
          "tuesday": {"breakfast": null, "lunch": null, "dinner": null},
          "wednesday": {"breakfast": null, "lunch": null, "dinner": null},
          "thursday": {"breakfast": null, "lunch": null, "dinner": null},
          "friday": {"breakfast": null, "lunch": null, "dinner": null},
          "saturday": {"breakfast": null, "lunch": null, "dinner": null},
          "sunday": {"breakfast": null, "lunch": null, "dinner": null}}',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '7 days'
    )
    RETURNING id INTO menu_id;
    
    RETURN menu_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier si un utilisateur peut accéder à une recette premium
CREATE OR REPLACE FUNCTION can_access_premium_recipe(user_id INTEGER, recipe_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    is_premium_recipe BOOLEAN;
    user_subscription_status SUBSCRIPTION_STATUS;
BEGIN
    -- Vérifier si la recette est premium
    SELECT is_premium INTO is_premium_recipe FROM recipes WHERE id = recipe_id;
    
    -- Si la recette n'est pas premium, tout le monde peut y accéder
    IF NOT is_premium_recipe THEN
        RETURN TRUE;
    END IF;
    
    -- Vérifier le statut d'abonnement de l'utilisateur
    SELECT subscription_status INTO user_subscription_status FROM users WHERE id = user_id;
    
    -- Seuls les utilisateurs avec abonnement actif peuvent accéder aux recettes premium
    RETURN user_subscription_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Initialisation des quotas d'accès
INSERT INTO access_quotas (user_type, feature_name, quota_limit) VALUES
  ('none', 'recipes', 50),
  ('monthly', 'recipes', -1), -- -1 signifie illimité
  ('annual', 'recipes', -1),
  ('none', 'menu_generations', -1), -- illimité même pour les utilisateurs gratuits
  ('monthly', 'menu_generations', -1),
  ('annual', 'menu_generations', -1);

-- Initialisation des plans d'abonnement
INSERT INTO subscription_plans (name, description, price, interval, subscription_type, features, stripe_price_id) VALUES
('Mensuel', 'Acces complet a toutes les recettes premium - Facturation mensuelle', 999, 'month', 'monthly', 
 '["Acces illimite a toutes les recettes","Generation de menus personnalises","Support client prioritaire"]', 'price_monthly'),
('Annuel', 'Acces complet a toutes les recettes premium - Facturation annuelle (2 mois offerts)', 9990, 'year', 'annual', 
 '["Acces illimite a toutes les recettes","Generation de menus personnalises","Support client prioritaire","Economisez 17% par rapport a l''abonnement mensuel"]', 'price_annual');