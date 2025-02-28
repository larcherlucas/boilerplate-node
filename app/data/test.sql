
/* 1. Insertion des utilisateurs
   - Administrateur (peut tout modifier)
   - Famille 1 : 1 adulte, 2 enfants de moins de 3 ans, avec restriction "pork-free" et préférence "favorite_food: apple"
   - Famille 2 : 2 adultes, sans enfants ni restrictions
*/
INSERT INTO users (username, email, password_hash, role, household_members, preferences, subscription_status)
VALUES
  ('admin_user', 'admin@example.com', 'hashed_admin_pass', 'admin',
   '{"adults": 1, "children_over_3": 0, "children_under_3": 0, "babies": 0}',
   '{"can_modify_all": true}', 'active'),
  ('family1', 'family1@example.com', 'hashed_family1_pass', 'user',
   '{"adults": 1, "children_over_3": 0, "children_under_3": 2, "babies": 0}',
   '{"favorite_food": "apple"}', 'active'),
  ('family2', 'family2@example.com', 'hashed_family2_pass', 'user',
   '{"adults": 2, "children_over_3": 0, "children_under_3": 0, "babies": 0}',
   '{}', 'active');

-- Insertion d'une restriction alimentaire pour la Famille 1 (id = 2)
INSERT INTO dietary_restrictions (user_id, restriction_type, details)
VALUES
  (2, 'pork-free', 'Ne consomme pas de porc');

-----------------------------------------------------------
-- 2. Insertion des produits de saison
-----------------------------------------------------------
INSERT INTO seasonal_items (name, type, seasons, description, image_url, nutritional_benefits, storage_tips)
VALUES
  ('Apple', 'fruit', '["autumn", "winter"]', 'Pomme croquante et sucrée', 'http://example.com/images/apple.jpg', 'Riche en fibres et vitamine C', 'Conserver dans un endroit frais et sec'),
  ('Tomato', 'vegetable', '["summer", "autumn"]', 'Tomate rouge juteuse', 'http://example.com/images/tomato.jpg', 'Source de vitamine C et de lycopène', 'À conserver à température ambiante à l\'abri du soleil'),
  ('Strawberry', 'fruit', '["spring", "summer"]', 'Fraises fraîches et parfumées', 'http://example.com/images/strawberry.jpg', 'Excellente source de vitamine C', 'Réfrigérer et consommer rapidement'),
  ('Spinach', 'vegetable', '["spring"]', 'Épinards frais et tendres', 'http://example.com/images/spinach.jpg', 'Riche en fer et vitamines', 'Garder au réfrigérateur et utiliser rapidement'),
  ('Broccoli', 'vegetable', '["autumn", "winter"]', 'Brocoli vert en fleurettes', 'http://example.com/images/broccoli.jpg', 'Riche en fibres et vitamine K', 'Conserver au frais'),
  ('Carrot', 'vegetable', '["all"]', 'Carottes croquantes', 'http://example.com/images/carrot.jpg', 'Source de bêta-carotène', 'À garder dans un endroit frais'),
  ('Pumpkin', 'vegetable', '["autumn"]', 'Citrouille de saison', 'http://example.com/images/pumpkin.jpg', 'Riche en vitamine A', 'Conserver dans un endroit sec et frais'),
  ('Orange', 'fruit', '["winter", "spring"]', 'Orange juteuse', 'http://example.com/images/orange.jpg', 'Bonne source de vitamine C', 'Conserver à l\'ombre dans un endroit frais');

-----------------------------------------------------------
-- 3. Insertion des menus hebdomadaires
-----------------------------------------------------------
-- Pour Famille 1 (id = 2)
INSERT INTO weekly_menus (user_id, meal_schedule, valid_from, valid_to)
VALUES
  (2, '{"monday": {"lunch": 2, "dinner": 5}, "tuesday": {"lunch": 3, "dinner": 7}}',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days');

-- Pour Famille 2 (id = 3)
INSERT INTO weekly_menus (user_id, meal_schedule, valid_from, valid_to)
VALUES
  (3, '{"wednesday": {"lunch": 12, "dinner": 15}, "thursday": {"lunch": 13, "dinner": 16}}',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days');

-----------------------------------------------------------
-- 4. Insertion des favoris
-----------------------------------------------------------
INSERT INTO favorites (user_id, recipe_id)
VALUES
  (2, 2),  -- Famille 1 aime la recette "Apple Sauce" (recette pour enfant)
  (3, 11), -- Famille 2 aime "Spaghetti Bolognese" (recette pour adultes)
  (1, 5);  -- L'admin a ajouté un favori (exemple)

-----------------------------------------------------------
-- 5. Insertion d'avis sur les recettes
-----------------------------------------------------------
INSERT INTO recipe_reviews (user_id, recipe_id, rating, comment)
VALUES
  (2, 2, 5, 'Délicieux et parfait pour les tout-petits !'),
  (3, 11, 4, 'Bien équilibré et savoureux.');

-----------------------------------------------------------
-- 6. Insertion de paiements
-----------------------------------------------------------
INSERT INTO payments (user_id, stripe_payment_id, amount, status, payment_type)
VALUES
  (3, 'pi_123456789', 1999, 'succeeded', 'subscription'),
  (2, 'pi_987654321', 999, 'succeeded', 'one_time');

-----------------------------------------------------------
-- 7. Insertion d'informations publiques
-----------------------------------------------------------
INSERT INTO public_info (landing_page_content, features, subscription_plans, faqs)
VALUES
  ('{"welcome_message": "Bienvenue sur notre plateforme de recettes!"}',
   '[{"title": "Recettes personnalisées", "description": "Des menus adaptés à vos besoins."}]',
   '[{"plan": "Basic", "price": "9.99 EUR/mois"}, {"plan": "Premium", "price": "19.99 EUR/mois"}]',
   '[{"question": "Comment s\'abonner?", "answer": "Cliquez sur le bouton d\'abonnement."}]');

-----------------------------------------------------------
-- 8. Insertion des recettes
-----------------------------------------------------------
/* 8.1. Recettes pour enfants de moins de 3 ans (10 recettes)
   Chaque recette précise dans sa description qu'elle est adaptée aux tout-petits.
   Pour ces recettes, nous utilisons l'admin (id = 1) comme auteur.
*/
INSERT INTO recipes (title, description, prep_time, difficulty_level, meal_type, season, is_premium, ingredients, steps, servings, author_id, image_url)
VALUES
  ('Banana Puree', 'Purée de banane onctueuse. Suitable for children under 3.', 5, 'easy', 'breakfast', 'all', false,
    '{"ingredients": [{"name": "banana", "quantity": 1, "unit": "piece"}]}',
    '{"steps": ["Peler la banane", "Écraser complètement"]}', 1, 1, 'http://example.com/images/banana_puree.jpg'),
    
  ('Apple Sauce', 'Compote de pomme maison, idéale pour les tout-petits. Suitable for children under 3.', 15, 'easy', 'snack', 'autumn', false,
    '{"ingredients": [{"name": "apple", "quantity": 3, "unit": "piece"}, {"name": "water", "quantity": 100, "unit": "ml"}]}',
    '{"steps": ["Éplucher et couper les pommes", "Cuire avec de l\'eau", "Mixer jusqu\'à consistance lisse"]}', 1, 1, 'http://example.com/images/apple_sauce.jpg'),
    
  ('Carrot Mash', 'Purée de carottes douce et légère. Suitable for children under 3.', 10, 'easy', 'lunch', 'all', false,
    '{"ingredients": [{"name": "carrot", "quantity": 2, "unit": "piece"}, {"name": "butter", "quantity": 10, "unit": "g"}]}',
    '{"steps": ["Cuire les carottes à l\'eau", "Écraser avec un peu de beurre"]}', 1, 1, 'http://example.com/images/carrot_mash.jpg'),
    
  ('Pea Puree', 'Purée de petits pois onctueuse pour bébés. Suitable for children under 3.', 10, 'easy', 'lunch', 'spring', false,
    '{"ingredients": [{"name": "peas", "quantity": 150, "unit": "g"}, {"name": "mint", "quantity": 2, "unit": "leaves"}]}',
    '{"steps": ["Cuire les petits pois", "Mixer avec quelques feuilles de menthe"]}', 1, 1, 'http://example.com/images/pea_puree.jpg'),
    
  ('Sweet Potato Mash', 'Purée de patate douce crémeuse pour tout-petits. Suitable for children under 3.', 20, 'easy', 'dinner', 'winter', false,
    '{"ingredients": [{"name": "sweet potato", "quantity": 1, "unit": "piece"}, {"name": "milk", "quantity": 50, "unit": "ml"}]}',
    '{"steps": ["Cuire la patate douce au four", "Écraser la chair et mélanger avec du lait tiède"]}', 1, 1, 'http://example.com/images/sweet_potato_mash.jpg'),
    
  ('Avocado Mash', 'Purée d\'avocat simple et nourrissante. Suitable for children under 3.', 5, 'easy', 'breakfast', 'all', false,
    '{"ingredients": [{"name": "avocado", "quantity": 1, "unit": "piece"}]}',
    '{"steps": ["Découper et écraser l\'avocat"]}', 1, 1, 'http://example.com/images/avocado_mash.jpg'),
    
  ('Pear Puree', 'Purée de poire délicate pour les tout-petits. Suitable for children under 3.', 10, 'easy', 'snack', 'autumn', false,
    '{"ingredients": [{"name": "pear", "quantity": 2, "unit": "piece"}]}',
    '{"steps": ["Éplucher, couper et cuire les poires, puis mixer"]}', 1, 1, 'http://example.com/images/pear_puree.jpg'),
    
  ('Rice Cereal', 'Céréale de riz fortifiée, idéale pour un petit-déjeuner léger. Suitable for children under 3.', 5, 'easy', 'breakfast', 'all', false,
    '{"ingredients": [{"name": "rice", "quantity": 50, "unit": "g"}, {"name": "water", "quantity": 100, "unit": "ml"}]}',
    '{"steps": ["Cuire le riz", "Mixer pour obtenir une consistance lisse"]}', 1, 1, 'http://example.com/images/rice_cereal.jpg'),
    
  ('Oatmeal with Banana', 'Bouillie d\'avoine et banane, crémeuse et réconfortante. Suitable for children under 3.', 10, 'easy', 'breakfast', 'all', false,
    '{"ingredients": [{"name": "oats", "quantity": 40, "unit": "g"}, {"name": "banana", "quantity": 0.5, "unit": "piece"}, {"name": "milk", "quantity": 100, "unit": "ml"}]}',
    '{"steps": ["Cuire les flocons d\'avoine avec du lait", "Ajouter la banane écrasée"]}', 1, 1, 'http://example.com/images/oatmeal_banana.jpg'),
    
  ('Pumpkin Puree', 'Purée de potiron douce et onctueuse pour bébé. Suitable for children under 3.', 15, 'easy', 'dinner', 'autumn', false,
    '{"ingredients": [{"name": "pumpkin", "quantity": 200, "unit": "g"}, {"name": "water", "quantity": 100, "unit": "ml"}]}',
    '{"steps": ["Cuire le potiron à la vapeur", "Mixer avec un peu d\'eau"]}', 1, 1, 'http://example.com/images/pumpkin_puree.jpg');

  
/* 8.2. Recettes pour un public général (10 recettes)
   Ces recettes sont créées par la Famille 2 (id = 3) et conviennent aux repas familiaux.
*/
INSERT INTO recipes (title, description, prep_time, difficulty_level, meal_type, season, is_premium, ingredients, steps, servings, author_id, image_url)
VALUES
  ('Spaghetti Bolognese', 'Un grand classique italien avec une sauce bolognaise riche.', 40, 'medium', 'dinner', 'all', false,
    '{"ingredients": [{"name": "spaghetti", "quantity": 400, "unit": "g"}, {"name": "ground beef", "quantity": 250, "unit": "g"}, {"name": "tomato sauce", "quantity": 200, "unit": "ml"}]}',
    '{"steps": ["Cuire les spaghetti", "Préparer la sauce avec la viande et la sauce tomate", "Mélanger et servir chaud"]}', 4, 3, 'http://example.com/images/spaghetti_bolognese.jpg'),
    
  ('Grilled Chicken Salad', 'Salade fraîche avec du poulet grillé, idéale pour un repas léger.', 25, 'easy', 'lunch', 'summer', false,
    '{"ingredients": [{"name": "chicken breast", "quantity": 200, "unit": "g"}, {"name": "mixed greens", "quantity": 100, "unit": "g"}, {"name": "vinaigrette", "quantity": 50, "unit": "ml"}]}',
    '{"steps": ["Griller le poulet", "Mélanger la salade avec la vinaigrette", "Disposer le poulet tranché sur le dessus"]}', 2, 3, 'http://example.com/images/grilled_chicken_salad.jpg'),
    
  ('Beef Stir Fry', 'Sauté de bœuf rapide et savoureux avec des légumes croquants.', 20, 'easy', 'dinner', 'spring', false,
    '{"ingredients": [{"name": "beef strips", "quantity": 250, "unit": "g"}, {"name": "bell peppers", "quantity": 2, "unit": "piece"}, {"name": "soy sauce", "quantity": 30, "unit": "ml"}]}',
    '{"steps": ["Saisir le bœuf", "Ajouter les légumes coupés", "Assaisonner avec de la sauce soja"]}', 3, 3, 'http://example.com/images/beef_stir_fry.jpg'),
    
  ('Vegetable Curry', 'Curry de légumes parfumé et réconfortant, parfait pour les soirées fraîches.', 35, 'medium', 'dinner', 'winter', false,
    '{"ingredients": [{"name": "potatoes", "quantity": 3, "unit": "piece"}, {"name": "carrots", "quantity": 2, "unit": "piece"}, {"name": "curry paste", "quantity": 50, "unit": "g"}]}',
    '{"steps": ["Couper les légumes", "Les mijoter avec la pâte de curry et du lait de coco"]}', 4, 3, 'http://example.com/images/vegetable_curry.jpg'),
    
  ('Pancakes', 'Crêpes moelleuses parfaites pour un petit-déjeuner gourmand.', 20, 'easy', 'breakfast', 'all', false,
    '{"ingredients": [{"name": "flour", "quantity": 200, "unit": "g"}, {"name": "milk", "quantity": 300, "unit": "ml"}, {"name": "egg", "quantity": 2, "unit": "piece"}]}',
    '{"steps": ["Mélanger les ingrédients", "Verser une louche sur la poêle chaude", "Retourner quand des bulles se forment"]}', 3, 3, 'http://example.com/images/pancakes.jpg'),
    
  ('Salmon with Rice', 'Saumon rôti accompagné de riz vapeur et d\'une touche de citron.', 30, 'medium', 'dinner', 'spring', false,
    '{"ingredients": [{"name": "salmon fillet", "quantity": 200, "unit": "g"}, {"name": "rice", "quantity": 150, "unit": "g"}, {"name": "lemon", "quantity": 1, "unit": "piece"}]}',
    '{"steps": ["Assaisonner le saumon", "Le cuire au four", "Servir avec du riz et une tranche de citron"]}', 2, 3, 'http://example.com/images/salmon_rice.jpg'),
    
  ('Tofu Stir Fry', 'Sauté de tofu et légumes croquants dans une sauce légère.', 15, 'easy', 'dinner', 'summer', false,
    '{"ingredients": [{"name": "tofu", "quantity": 200, "unit": "g"}, {"name": "bell peppers", "quantity": 2, "unit": "piece"}, {"name": "soy sauce", "quantity": 25, "unit": "ml"}]}',
    '{"steps": ["Faire sauter le tofu", "Ajouter les poivrons", "Assaisonner et servir chaud"]}', 3, 3, 'http://example.com/images/tofu_stir_fry.jpg'),
    
  ('Chicken Soup', 'Soupe de poulet réconfortante aux légumes variés.', 45, 'easy', 'lunch', 'winter', false,
    '{"ingredients": [{"name": "chicken", "quantity": 300, "unit": "g"}, {"name": "carrots", "quantity": 2, "unit": "piece"}, {"name": "celery", "quantity": 2, "unit": "stalk"}]}',
    '{"steps": ["Faire bouillir le poulet", "Ajouter les légumes coupés", "Laisser mijoter jusqu\'à tendreté"]}', 4, 3, 'http://example.com/images/chicken_soup.jpg'),
    
  ('Quinoa Salad', 'Salade de quinoa saine et rafraîchissante aux légumes frais.', 20, 'easy', 'lunch', 'summer', false,
    '{"ingredients": [{"name": "quinoa", "quantity": 150, "unit": "g"}, {"name": "cucumber", "quantity": 1, "unit": "piece"}, {"name": "tomatoes", "quantity": 2, "unit": "piece"}]}',
    '{"steps": ["Cuire le quinoa", "Mélanger avec des légumes coupés", "Assaisonner avec une vinaigrette légère"]}', 2, 3, 'http://example.com/images/quinoa_salad.jpg'),
    
  ('Margherita Pizza', 'Pizza classique à la margherita avec sauce tomate, mozzarella et basilic frais.', 30, 'medium', 'dinner', 'all', false,
    '{"ingredients": [{"name": "pizza dough", "quantity": 1, "unit": "piece"}, {"name": "tomato sauce", "quantity": 100, "unit": "ml"}, {"name": "mozzarella", "quantity": 100, "unit": "g"}, {"name": "basil", "quantity": 5, "unit": "leaves"}]}',
    '{"steps": ["Étaler la pâte", "Ajouter la sauce tomate et la mozzarella", "Cuire au four et garnir de basilic frais"]}', 2, 3, 'http://example.com/images/margherita_pizza.jpg');
