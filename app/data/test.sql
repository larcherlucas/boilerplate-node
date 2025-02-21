INSERT INTO users (email, password_hash, role, household_members, subscription_status) VALUES
('admin@test.com', 'hashed_password_1', 'admin', '{"adults": 2, "children_over_3": 1, "children_under_3": 0, "babies": 0}', 'active'),
('user@test.com', 'hashed_password_2', 'user', '{"adults": 1, "children_over_3": 0, "children_under_3": 1, "babies": 0}', 'pending');

-- Recettes
INSERT INTO recipes (title, description, prep_time, difficulty_level, meal_type, ingredients, steps, author_id) VALUES
('Spaghetti Carbonara', 'Classic Italian pasta dish', 30, 'medium', 'dinner', 
'{"ingredients": [{"name": "spaghetti", "quantity": 400, "unit": "g"}, {"name": "eggs", "quantity": 4, "unit": "piece"}]}',
'{"steps": ["Boil pasta", "Prepare sauce", "Mix together"]}',
1),
('Green Salad', 'Fresh garden salad', 15, 'easy', 'lunch',
'{"ingredients": [{"name": "lettuce", "quantity": 1, "unit": "head"}, {"name": "tomatoes", "quantity": 2, "unit": "piece"}]}',
'{"steps": ["Wash vegetables", "Cut ingredients", "Mix with dressing"]}',
1);

-- Produits de saison
INSERT INTO seasonal_items (name, type, seasons, description) VALUES
('Tomato', 'vegetable', '["summer", "autumn"]', 'Fresh red tomatoes'),
('Apple', 'fruit', '["autumn", "winter"]', 'Crisp seasonal apples');

-- Menus
INSERT INTO menus (user_id, type, meal_schedule, valid_from, valid_to) VALUES
(1, 'weekly', '{"monday": {"lunch": 1, "dinner": 2}}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days'),
(2, 'weekly', '{"monday": {"lunch": 2, "dinner": 1}}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days');

-- Favoris
INSERT INTO favorites (user_id, recipe_id) VALUES
(1, 1),
(2, 2);

-- Restrictions alimentaires
INSERT INTO dietary_restrictions (user_id, restriction_type, details) VALUES
(1, 'vegetarian', 'No meat products'),
(2, 'gluten-free', 'Celiac disease');

-- Avis sur les recettes
INSERT INTO recipe_reviews (user_id, recipe_id, rating, comment) VALUES
(1, 2, 5, 'Excellent fresh salad!'),
(2, 1, 4, 'Good pasta dish, but could use more pepper');