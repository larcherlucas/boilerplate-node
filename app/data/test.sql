-- Vérification de la structure des tables
BEGIN;

-- 1. Insertion des utilisateurs avec différents types d'abonnement
INSERT INTO users (username, email, password_hash, role, household_members, subscription_type, subscription_status, subscription_start_date, subscription_end_date)
VALUES
  ('admin_user', 'admin@example.com', '$2a$10$TM.gOaQZQCcm7Bj8PeGOL.CV0/r7H.OQ1TBVo1qCVtZkHQJzAZFHm', 'admin',
  '{"adults": 1, "children_over_3": 0, "children_under_3": 0, "babies": 0}',
  'annual', 'active', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP + INTERVAL '335 days'),
  
  ('family1', 'family1@example.com', '$2a$10$AplTr1vNpx9QySJJ.WKA8uvjcVFxqTYjLimoRBCYTD8D88yVl58dS', 'user',
  '{"adults": 1, "children_over_3": 0, "children_under_3": 2, "babies": 0}',
  'none', 'inactive', NULL, NULL),
  
  ('family2', 'family2@example.com', '$2a$10$BzPKBKHgEUULe.jWEY5y3.XHZEXnUXt9Hd5YKT07TYdvwmuG3XyLm', 'user',
  '{"adults": 2, "children_over_3": 0, "children_under_3": 0, "babies": 0}',
  'monthly', 'active', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP + INTERVAL '15 days'),
  
  ('expired_user', 'expired@example.com', '$2a$10$XwGQEL3BdEF9Pn1OvYgp4.M.fDYr94TZzpYcOu8zHmmzXrB.jZj76', 'user',
  '{"adults": 1, "children_over_3": 1, "children_under_3": 0, "babies": 0}',
  'monthly', 'expired', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '30 days');

-- 2. Insertion des restrictions alimentaires
INSERT INTO dietary_restrictions (user_id, restriction_type, details)
VALUES
  (2, 'pork-free', 'Ne consomme pas de porc'),
  (2, 'allergy', 'Fruits à coque'),
  (3, 'vegetarian', 'Pas de viande'),
  (4, 'gluten-free', 'Intolérance au gluten');

-- 3. Insertion des produits de saison
INSERT INTO ingredients_seasonal (name, type, seasons, description, image_url, nutritional_benefits, storage_tips)
VALUES
  ('Pomme', 'fruit', '["autumn", "winter"]', 'Pomme croquante et sucrée', 'https://example.com/images/apple.jpg', 'Riche en fibres et vitamine C', 'Conserver dans un endroit frais et sec'),
  ('Tomate', 'vegetable', '["summer", "autumn"]', 'Tomate rouge juteuse', 'https://example.com/images/tomato.jpg', 'Source de vitamine C et de lycopène', 'À conserver à température ambiante à l''abri du soleil'),
  ('Fraise', 'fruit', '["spring", "summer"]', 'Fraises fraîches et parfumées', 'https://example.com/images/strawberry.jpg', 'Excellente source de vitamine C', 'Réfrigérer et consommer rapidement'),
  ('Épinard', 'vegetable', '["spring"]', 'Épinards frais et tendres', 'https://example.com/images/spinach.jpg', 'Riche en fer et vitamines', 'Garder au réfrigérateur et utiliser rapidement'),
  ('Brocoli', 'vegetable', '["autumn", "winter"]', 'Brocoli vert en fleurettes', 'https://example.com/images/broccoli.jpg', 'Riche en fibres et vitamine K', 'Conserver au frais'),
  ('Carotte', 'vegetable', '["all"]', 'Carottes croquantes', 'https://example.com/images/carrot.jpg', 'Source de bêta-carotène', 'À garder dans un endroit frais'),
  ('Citrouille', 'vegetable', '["autumn"]', 'Citrouille de saison', 'https://example.com/images/pumpkin.jpg', 'Riche en vitamine A', 'Conserver dans un endroit sec et frais'),
  ('Orange', 'fruit', '["winter", "spring"]', 'Orange juteuse', 'https://example.com/images/orange.jpg', 'Bonne source de vitamine C', 'Conserver à l''ombre dans un endroit frais'),
  ('Basilic', 'herb', '["summer"]', 'Basilic frais aromatique', 'https://example.com/images/basil.jpg', 'Antioxydants et huiles essentielles', 'Conserver dans un verre d''eau comme un bouquet'),
  ('Thym', 'herb', '["all"]', 'Thym parfumé', 'https://example.com/images/thyme.jpg', 'Propriétés antibactériennes', 'Sécher ou conserver au réfrigérateur');

-- 4.1 Recettes pour enfants (non-premium)
INSERT INTO recipes (title, description, prep_time, cook_time, difficulty_level, meal_type, season, is_premium, premium_rank, ingredients, steps, servings, author_id, image_url)
VALUES
  ('Purée de banane', 'Purée de banane onctueuse. Adaptée aux enfants de moins de 3 ans.', 5, 0, 'easy', 'breakfast', 'all', false, NULL,
    '{"ingredients": [{"name": "banane", "quantity": 1, "unit": "pièce"}]}',
    '{"steps": ["Peler la banane", "Écraser complètement"]}', 1, 1, 'https://example.com/images/banana_puree.jpg'),
    
  ('Compote de pomme', 'Compote de pomme maison, idéale pour les tout-petits. Adaptée aux enfants de moins de 3 ans.', 15, 10, 'easy', 'snack', 'autumn', false, NULL,
    '{"ingredients": [{"name": "pomme", "quantity": 3, "unit": "pièce"}, {"name": "eau", "quantity": 100, "unit": "ml"}]}',
    '{"steps": ["Éplucher et couper les pommes", "Cuire avec de l''eau", "Mixer jusqu''à consistance lisse"]}', 1, 1, 'https://example.com/images/apple_sauce.jpg'),
    
  ('Purée de carottes', 'Purée de carottes douce et légère. Adaptée aux enfants de moins de 3 ans.', 10, 15, 'easy', 'lunch', 'all', false, NULL,
    '{"ingredients": [{"name": "carotte", "quantity": 2, "unit": "pièce"}, {"name": "beurre", "quantity": 10, "unit": "g"}]}',
    '{"steps": ["Cuire les carottes à l''eau", "Écraser avec un peu de beurre"]}', 1, 1, 'https://example.com/images/carrot_mash.jpg'),
    
  ('Purée de petits pois', 'Purée de petits pois onctueuse pour bébés. Adaptée aux enfants de moins de 3 ans.', 10, 10, 'easy', 'lunch', 'spring', false, NULL,
    '{"ingredients": [{"name": "petits pois", "quantity": 150, "unit": "g"}, {"name": "menthe", "quantity": 2, "unit": "feuilles"}]}',
    '{"steps": ["Cuire les petits pois", "Mixer avec quelques feuilles de menthe"]}', 1, 1, 'https://example.com/images/pea_puree.jpg'),
    
  ('Purée de patate douce', 'Purée de patate douce crémeuse pour tout-petits. Adaptée aux enfants de moins de 3 ans.', 20, 25, 'easy', 'dinner', 'winter', false, NULL,
    '{"ingredients": [{"name": "patate douce", "quantity": 1, "unit": "pièce"}, {"name": "lait", "quantity": 50, "unit": "ml"}]}',
    '{"steps": ["Cuire la patate douce au four", "Écraser la chair et mélanger avec du lait tiède"]}', 1, 1, 'https://example.com/images/sweet_potato_mash.jpg');

-- 4.2 Recettes standard (non-premium)
INSERT INTO recipes (title, description, prep_time, cook_time, difficulty_level, meal_type, season, is_premium, premium_rank, ingredients, steps, servings, author_id, image_url)
VALUES
  ('Crêpes simples', 'Délicieuses crêpes françaises traditionnelles.', 15, 20, 'easy', 'breakfast', 'all', false, NULL,
    '{"ingredients": [{"name": "farine", "quantity": 250, "unit": "g"}, {"name": "oeufs", "quantity": 4, "unit": "pièce"}, {"name": "lait", "quantity": 500, "unit": "ml"}, {"name": "beurre", "quantity": 50, "unit": "g"}, {"name": "sel", "quantity": 1, "unit": "pincée"}]}',
    '{"steps": ["Mélanger la farine et les oeufs", "Ajouter progressivement le lait", "Faire fondre le beurre et l''incorporer", "Laisser reposer 1h", "Cuire dans une poêle chaude"]}', 4, 3, 'https://example.com/images/crepes.jpg'),
    
  ('Salade de concombre', 'Salade fraîche et légère pour l''été.', 10, 0, 'easy', 'lunch', 'summer', false, NULL,
    '{"ingredients": [{"name": "concombre", "quantity": 1, "unit": "pièce"}, {"name": "yaourt grec", "quantity": 100, "unit": "g"}, {"name": "aneth", "quantity": 1, "unit": "cuillère à soupe"}, {"name": "ail", "quantity": 1, "unit": "gousse"}, {"name": "huile d''olive", "quantity": 1, "unit": "cuillère à soupe"}]}',
    '{"steps": ["Laver et couper le concombre en rondelles", "Mélanger le yaourt avec l''aneth et l''ail écrasé", "Assaisonner et servir frais"]}', 2, 2, 'https://example.com/images/cucumber_salad.jpg'),
    
  ('Omelette aux herbes', 'Omelette simple et savoureuse aux herbes fraîches.', 5, 10, 'easy', 'breakfast', 'all', false, NULL,
    '{"ingredients": [{"name": "oeufs", "quantity": 3, "unit": "pièce"}, {"name": "persil", "quantity": 1, "unit": "cuillère à soupe"}, {"name": "ciboulette", "quantity": 1, "unit": "cuillère à soupe"}, {"name": "beurre", "quantity": 15, "unit": "g"}, {"name": "sel et poivre", "quantity": 1, "unit": "pincée"}]}',
    '{"steps": ["Battre les oeufs avec les herbes hachées", "Faire fondre le beurre dans une poêle", "Verser les oeufs et cuire à feu moyen", "Replier l''omelette et servir"]}', 1, 2, 'https://example.com/images/herb_omelette.jpg'),
    
  ('Riz aux légumes', 'Plat de riz simple et nutritif, idéal pour toute la famille.', 15, 25, 'easy', 'dinner', 'all', false, NULL,
    '{"ingredients": [{"name": "riz", "quantity": 200, "unit": "g"}, {"name": "carottes", "quantity": 2, "unit": "pièce"}, {"name": "petits pois", "quantity": 100, "unit": "g"}, {"name": "oignon", "quantity": 1, "unit": "pièce"}, {"name": "bouillon de légumes", "quantity": 500, "unit": "ml"}]}',
    '{"steps": ["Faire revenir l''oignon émincé", "Ajouter les carottes coupées en dés", "Incorporer le riz et faire nacrer", "Verser le bouillon chaud et cuire 18 minutes", "Ajouter les petits pois en fin de cuisson"]}', 4, 3, 'https://example.com/images/vegetable_rice.jpg'),
    
  ('Smoothie aux fruits rouges', 'Boisson rafraîchissante et vitaminée.', 10, 0, 'easy', 'breakfast', 'summer', false, NULL,
    '{"ingredients": [{"name": "fraises", "quantity": 150, "unit": "g"}, {"name": "framboises", "quantity": 100, "unit": "g"}, {"name": "yaourt", "quantity": 200, "unit": "g"}, {"name": "miel", "quantity": 1, "unit": "cuillère à soupe"}, {"name": "jus d''orange", "quantity": 100, "unit": "ml"}]}',
    '{"steps": ["Rincer les fruits rouges", "Mettre tous les ingrédients dans un blender", "Mixer jusqu''à obtenir une texture lisse", "Servir immédiatement"]}', 2, 3, 'https://example.com/images/berry_smoothie.jpg');

-- 4.3 Recettes premium (réservées aux abonnés)
INSERT INTO recipes (title, description, prep_time, cook_time, difficulty_level, meal_type, season, is_premium, premium_rank, ingredients, steps, servings, author_id, image_url)
VALUES
  ('Risotto aux champignons sauvages', 'Risotto crémeux aux champignons des bois et parmesan.', 20, 30, 'medium', 'dinner', 'autumn', true, 1,
    '{"ingredients": [{"name": "riz arborio", "quantity": 300, "unit": "g"}, {"name": "champignons des bois", "quantity": 250, "unit": "g"}, {"name": "échalote", "quantity": 2, "unit": "pièce"}, {"name": "vin blanc sec", "quantity": 100, "unit": "ml"}, {"name": "bouillon de volaille", "quantity": 1, "unit": "litre"}, {"name": "parmesan", "quantity": 80, "unit": "g"}, {"name": "beurre", "quantity": 50, "unit": "g"}, {"name": "huile d''olive", "quantity": 2, "unit": "cuillère à soupe"}, {"name": "thym", "quantity": 2, "unit": "brins"}]}',
    '{"steps": ["Faire chauffer le bouillon", "Faire revenir les échalotes dans l''huile et le beurre", "Ajouter les champignons et le thym, cuire 5 minutes", "Ajouter le riz et faire nacrer 2 minutes", "Déglacer au vin blanc", "Ajouter le bouillon louche par louche en remuant constamment", "En fin de cuisson, ajouter le parmesan râpé et le reste du beurre", "Laisser reposer 2 minutes avant de servir"]}', 4, 1, 'https://example.com/images/mushroom_risotto.jpg'),
    
  ('Filet de bœuf Wellington', 'Élégant filet de bœuf en croûte avec duxelles de champignons.', 60, 45, 'hard', 'dinner', 'winter', true, 2,
    '{"ingredients": [{"name": "filet de bœuf", "quantity": 800, "unit": "g"}, {"name": "pâte feuilletée", "quantity": 1, "unit": "rouleau"}, {"name": "champignons de Paris", "quantity": 400, "unit": "g"}, {"name": "échalotes", "quantity": 2, "unit": "pièce"}, {"name": "jambon de Parme", "quantity": 6, "unit": "tranches"}, {"name": "jaune d''œuf", "quantity": 1, "unit": "pièce"}, {"name": "moutarde à l''ancienne", "quantity": 2, "unit": "cuillère à soupe"}, {"name": "thym", "quantity": 2, "unit": "brins"}, {"name": "huile d''olive", "quantity": 2, "unit": "cuillère à soupe"}]}',
    '{"steps": ["Saisir le filet de bœuf sur toutes ses faces", "Préparer la duxelles: mixer les champignons avec les échalotes et faire revenir", "Badigeonner le filet de moutarde", "Étaler la pâte feuilletée, disposer les tranches de jambon", "Étaler la duxelles sur le jambon", "Placer le filet et refermer la pâte", "Badigeonner de jaune d''œuf", "Cuire au four à 200°C pendant 35-40 minutes"]}', 6, 1, 'https://example.com/images/beef_wellington.jpg'),
    
  ('Soufflé au chocolat', 'Dessert élégant et aérien au chocolat noir.', 30, 15, 'hard', 'dessert', 'all', true, 3,
    '{"ingredients": [{"name": "chocolat noir", "quantity": 200, "unit": "g"}, {"name": "beurre", "quantity": 50, "unit": "g"}, {"name": "œufs", "quantity": 6, "unit": "pièce"}, {"name": "sucre", "quantity": 100, "unit": "g"}, {"name": "farine", "quantity": 20, "unit": "g"}, {"name": "beurre et sucre pour les ramequins", "quantity": 1, "unit": "cuillère à soupe"}]}',
    '{"steps": ["Préchauffer le four à 200°C", "Beurrer et sucrer les ramequins", "Faire fondre le chocolat avec le beurre au bain-marie", "Séparer les blancs des jaunes", "Mélanger les jaunes avec la moitié du sucre, puis avec le chocolat fondu", "Incorporer délicatement la farine", "Monter les blancs en neige avec le reste du sucre", "Incorporer délicatement les blancs à la préparation au chocolat", "Remplir les ramequins et enfourner 10-12 minutes"]}', 6, 3, 'https://example.com/images/chocolate_souffle.jpg'),
    
  ('Poke bowl au saumon', 'Bowl hawaïen frais et équilibré au saumon mariné.', 25, 15, 'medium', 'lunch', 'summer', true, 4,
    '{"ingredients": [{"name": "filet de saumon frais", "quantity": 300, "unit": "g"}, {"name": "riz à sushi", "quantity": 250, "unit": "g"}, {"name": "avocat", "quantity": 1, "unit": "pièce"}, {"name": "concombre", "quantity": 1, "unit": "pièce"}, {"name": "carotte", "quantity": 1, "unit": "pièce"}, {"name": "edamame", "quantity": 100, "unit": "g"}, {"name": "sauce soja", "quantity": 4, "unit": "cuillère à soupe"}, {"name": "huile de sésame", "quantity": 1, "unit": "cuillère à soupe"}, {"name": "graines de sésame", "quantity": 2, "unit": "cuillère à soupe"}, {"name": "algue nori", "quantity": 1, "unit": "feuille"}]}',
    '{"steps": ["Cuire le riz selon les instructions", "Couper le saumon en cubes et le mariner dans la sauce soja et l''huile de sésame", "Préparer tous les légumes: couper l''avocat et le concombre en tranches, râper la carotte", "Dresser le riz dans des bols", "Disposer harmonieusement le saumon et les légumes", "Parsemer de graines de sésame et de lanières d''algue nori"]}', 2, 1, 'https://example.com/images/salmon_poke_bowl.jpg'),
    
  ('Tarte tatin aux figues et romarin', 'Variation gourmande de la tarte tatin traditionnelle avec des figues fraîches.', 30, 35, 'medium', 'dessert', 'autumn', true, 5,
    '{"ingredients": [{"name": "figues fraîches", "quantity": 12, "unit": "pièce"}, {"name": "pâte feuilletée", "quantity": 1, "unit": "rouleau"}, {"name": "sucre", "quantity": 150, "unit": "g"}, {"name": "beurre", "quantity": 80, "unit": "g"}, {"name": "romarin frais", "quantity": 2, "unit": "brins"}, {"name": "miel", "quantity": 2, "unit": "cuillère à soupe"}]}',
    '{"steps": ["Préchauffer le four à 180°C", "Couper les figues en deux", "Dans une poêle allant au four, faire un caramel avec le sucre et le beurre", "Ajouter le romarin émietté et le miel", "Disposer les figues face coupée vers le bas", "Recouvrir de pâte feuilletée en rentrant les bords", "Enfourner pendant 30 minutes", "Laisser tiédir et retourner sur un plat"]}', 8, 1, 'https://example.com/images/fig_tarte_tatin.jpg');

-- 5. Insertion des menus hebdomadaires
INSERT INTO weekly_menus (user_id, meal_schedule, menu_type, valid_from, valid_to, is_customized, family_size)
VALUES
  (2, '{"monday": {"breakfast": {"recipe_id": 1, "title": "Purée de banane"}, "lunch": {"recipe_id": 3, "title": "Purée de carottes"}, "dinner": {"recipe_id": 5, "title": "Purée de patate douce"}},
    "tuesday": {"breakfast": {"recipe_id": 2, "title": "Compote de pomme"}, "lunch": {"recipe_id": 4, "title": "Purée de petits pois"}, "dinner": {"recipe_id": 3, "title": "Purée de carottes"}}}',
  'weekly', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', false, 3),
  
  (3, '{"wednesday": {"breakfast": {"recipe_id": 8, "title": "Omelette aux herbes"}, "lunch": {"recipe_id": 7, "title": "Salade de concombre"}, "dinner": {"recipe_id": 9, "title": "Riz aux légumes"}},
    "thursday": {"breakfast": {"recipe_id": 10, "title": "Smoothie aux fruits rouges"}, "lunch": {"recipe_id": 9, "title": "Riz aux légumes"}, "dinner": {"recipe_id": 11, "title": "Risotto aux champignons sauvages"}}}',
  'weekly', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', true, 2);

-- 6. Insertion des favoris
INSERT INTO favorites (user_id, recipe_id)
VALUES
  (2, 2),  -- Famille 1 aime la "Compote de pomme" (recette pour enfant)
  (3, 11), -- Famille 2 aime le "Risotto aux champignons sauvages" (recette premium)
  (2, 10), -- Famille 1 aime aussi le "Smoothie aux fruits rouges"
  (3, 9),  -- Famille 2 aime aussi le "Riz aux légumes"
  (1, 12); -- Admin aime le "Filet de bœuf Wellington"

-- 7. Insertion des avis sur les recettes
INSERT INTO recipe_reviews (user_id, recipe_id, rating, comment)
VALUES
  (2, 2, 5, 'Parfait pour mes enfants, ils adorent !'),
  (3, 11, 4, 'Excellent risotto, la recette est bien détaillée.'),
  (3, 9, 5, 'Simple et délicieux, le riz est parfaitement cuit.'),
  (2, 10, 4, 'Mes enfants adorent ce smoothie au petit-déjeuner.');

-- 8. Insertion de paiements (historique)
INSERT INTO payments (user_id, stripe_payment_id, stripe_invoice_id, amount, currency, status, payment_method, payment_type)
VALUES
  (1, 'pi_admin_annual', 'in_admin_annual', 9990, 'EUR', 'succeeded', 'card', 'subscription'),
  (3, 'pi_family2_monthly', 'in_family2_monthly', 999, 'EUR', 'succeeded', 'card', 'subscription'),
  (4, 'pi_expired_monthly', 'in_expired_monthly', 999, 'EUR', 'succeeded', 'card', 'subscription');

-- 9. Insertion des contenus publics
INSERT INTO app_settings (landing_page_content, features, subscription_plans, faqs)
VALUES
  ('{"welcome_message": "Bienvenue sur Menu Planner - Votre assistant pour des repas équilibrés en famille", 
    "hero_image": "https://example.com/images/hero.jpg",
    "headline": "Planifiez vos repas facilement pour toute la famille",
    "subheadline": "Recettes adaptées à tous les âges, restrictions alimentaires prises en compte"}',
  '[
    {"title": "Recettes adaptées", "description": "Des recettes adaptées à tous les membres de votre famille", "icon": "family"},
    {"title": "Planification automatique", "description": "Création automatique de menus hebdomadaires équilibrés", "icon": "calendar"},
    {"title": "Aliments de saison", "description": "Privilégie les ingrédients de saison pour une alimentation plus responsable", "icon": "leaf"},
    {"title": "Restrictions alimentaires", "description": "Prend en compte toutes vos restrictions et préférences", "icon": "filter"}
  ]',
  '[
    {"id": "monthly", "name": "Abonnement Mensuel", "price": "9.99€", "interval": "mois", "features": ["Accès à toutes les recettes", "Génération de menus illimitée", "Support personnalisé"]},
    {"id": "annual", "name": "Abonnement Annuel", "price": "99.90€", "interval": "an", "features": ["Accès à toutes les recettes", "Génération de menus illimitée", "Support personnalisé", "Économisez 17% par rapport au tarif mensuel"]}
  ]',
  '[
    {"question": "Comment fonctionne le générateur de menus ?", "answer": "Notre générateur utilise vos préférences, restrictions alimentaires et la composition de votre foyer pour créer des menus adaptés et équilibrés."},
    {"question": "Y a-t-il une version gratuite ?", "answer": "Oui, vous pouvez utiliser gratuitement le générateur de menus et accéder à une sélection de 50 recettes sans abonnement."},
    {"question": "Puis-je annuler mon abonnement à tout moment ?", "answer": "Oui, vous pouvez annuler votre abonnement quand vous le souhaitez. Vous conserverez l''accès jusqu''à la fin de la période payée."}
  ]');

COMMIT;