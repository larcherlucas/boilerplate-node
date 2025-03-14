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
  ('Tomate', 'vegetable', '["summer", "autumn"]', 'Tomate rouge juteuse', 'https://example.com/images/tomato.jpg', 'Source de vitamine C et de lycopene', 'A conserver a temperature ambiante a l''abri du soleil'),
  ('Fraise', 'fruit', '["spring", "summer"]', 'Fraises fraiches et parfumees', 'https://example.com/images/strawberry.jpg', 'Excellente source de vitamine C', 'Refrigerer et consommer rapidement'),
  ('Epinard', 'vegetable', '["spring"]', 'Epinards frais et tendres', 'https://example.com/images/spinach.jpg', 'Riche en fer et vitamines', 'Garder au refrigerateur et utiliser rapidement'),
  ('Brocoli', 'vegetable', '["autumn", "winter"]', 'Brocoli vert en fleurettes', 'https://example.com/images/broccoli.jpg', 'Riche en fibres et vitamine K', 'Conserver au frais'),
  ('Carotte', 'vegetable', '["all"]', 'Carottes croquantes', 'https://example.com/images/carrot.jpg', 'Source de beta-carotene', 'A garder dans un endroit frais'),
  ('Citrouille', 'vegetable', '["autumn"]', 'Citrouille de saison', 'https://example.com/images/pumpkin.jpg', 'Riche en vitamine A', 'Conserver dans un endroit sec et frais'),
  ('Orange', 'fruit', '["winter", "spring"]', 'Orange juteuse', 'https://example.com/images/orange.jpg', 'Bonne source de vitamine C', 'Conserver a l''ombre dans un endroit frais'),
  ('Basilic', 'herb', '["summer"]', 'Basilic frais aromatique', 'https://example.com/images/basil.jpg', 'Antioxydants et huiles essentielles', 'Conserver dans un verre d''eau comme un bouquet'),
  ('Thym', 'herb', '["all"]', 'Thym parfume', 'https://example.com/images/thyme.jpg', 'Proprietes antibacteriennes', 'Secher ou conserver au refrigerateur');

-- 4.1 Recettes pour enfants (non-premium) - Utilise le nouveau format d'ingrédients et étapes
INSERT INTO recipes (title, description, prep_time, cook_time, difficulty_level, meal_type, season, is_premium, premium_rank, ingredients, steps, servings, author_id, image_url)
VALUES
  ('Puree de banane', 'Puree de banane onctueuse. Adaptee aux enfants de moins de 3 ans.', 5, 0, 'easy', 'breakfast', 'all', false, NULL,
    '{"ingredients": [{"name": "banane", "quantity": 1, "unit": "piece"}]}',
    '{"steps": ["Peler la banane", "Ecraser completement"]}', 1, 1, 'https://example.com/images/banana_puree.jpg'),
    
  ('Compote de pomme', 'Compote de pomme maison, ideale pour les tout-petits. Adaptee aux enfants de moins de 3 ans.', 15, 10, 'easy', 'snack', 'autumn', false, NULL,
    '{"ingredients": [{"name": "pomme", "quantity": 3, "unit": "piece"}, {"name": "eau", "quantity": 100, "unit": "ml"}]}',
    '{"steps": ["Eplucher et couper les pommes", "Cuire avec de l''eau", "Mixer jusqu''a consistance lisse"]}', 1, 1, 'https://example.com/images/apple_sauce.jpg'),
    
  ('Puree de carottes', 'Puree de carottes douce et legere. Adaptee aux enfants de moins de 3 ans.', 10, 15, 'easy', 'lunch', 'all', false, NULL,
    '{"ingredients": [{"name": "carotte", "quantity": 2, "unit": "piece"}, {"name": "beurre", "quantity": 10, "unit": "g"}]}',
    '{"steps": ["Cuire les carottes a l''eau", "Ecraser avec un peu de beurre"]}', 1, 1, 'https://example.com/images/carrot_mash.jpg'),
    
  ('Puree de petits pois', 'Puree de petits pois onctueuse pour bebes. Adaptee aux enfants de moins de 3 ans.', 10, 10, 'easy', 'lunch', 'spring', false, NULL,
    '{"ingredients": [{"name": "petits pois", "quantity": 150, "unit": "g"}, {"name": "menthe", "quantity": 2, "unit": "feuilles"}]}',
    '{"steps": ["Cuire les petits pois", "Mixer avec quelques feuilles de menthe"]}', 1, 1, 'https://example.com/images/pea_puree.jpg'),
    
  ('Puree de patate douce', 'Puree de patate douce cremeuse pour tout-petits. Adaptee aux enfants de moins de 3 ans.', 20, 25, 'easy', 'dinner', 'winter', false, NULL,
    '{"ingredients": [{"name": "patate douce", "quantity": 1, "unit": "piece"}, {"name": "lait", "quantity": 50, "unit": "ml"}]}',
    '{"steps": ["Cuire la patate douce au four", "Ecraser la chair et melanger avec du lait tiede"]}', 1, 1, 'https://example.com/images/sweet_potato_mash.jpg');

-- 4.2 Recettes standard (non-premium)
-- 4.2 Recettes standard (non-premium)
INSERT INTO recipes (title, description, prep_time, cook_time, difficulty_level, meal_type, season, is_premium, premium_rank, ingredients, steps, servings, author_id, image_url)
VALUES
  ('Crepes simples', 'Delicieuses crepes francaises traditionnelles.', 15, 20, 'easy', 'breakfast', 'all', false, NULL,
    '{"ingredients": [{"name": "farine", "quantity": 250, "unit": "g"}, {"name": "oeufs", "quantity": 4, "unit": "piece"}, {"name": "lait", "quantity": 500, "unit": "ml"}, {"name": "beurre", "quantity": 50, "unit": "g"}, {"name": "sel", "quantity": 1, "unit": "pincee"}]}',
    '{"steps": ["Melanger la farine et les oeufs", "Ajouter progressivement le lait", "Faire fondre le beurre et l''incorporer", "Laisser reposer 1h", "Cuire dans une poele chaude"]}', 4, 3, 'https://example.com/images/crepes.jpg'),
    
  ('Salade de concombre', 'Salade fraiche et legere pour l''ete.', 10, 0, 'easy', 'lunch', 'summer', false, NULL,
    '{"ingredients": [{"name": "concombre", "quantity": 1, "unit": "piece"}, {"name": "yaourt grec", "quantity": 100, "unit": "g"}, {"name": "aneth", "quantity": 1, "unit": "cuillere a soupe"}, {"name": "ail", "quantity": 1, "unit": "gousse"}, {"name": "huile d''olive", "quantity": 1, "unit": "cuillere a soupe"}]}',
    '{"steps": ["Laver et couper le concombre en rondelles", "Melanger le yaourt avec l''aneth et l''ail ecrase", "Assaisonner et servir frais"]}', 2, 2, 'https://example.com/images/cucumber_salad.jpg'),
    
  ('Omelette aux herbes', 'Omelette simple et savoureuse aux herbes fraiches.', 5, 10, 'easy', 'breakfast', 'all', false, NULL,
    '{"ingredients": [{"name": "oeufs", "quantity": 3, "unit": "piece"}, {"name": "persil", "quantity": 1, "unit": "cuillere a soupe"}, {"name": "ciboulette", "quantity": 1, "unit": "cuillere a soupe"}, {"name": "beurre", "quantity": 15, "unit": "g"}, {"name": "sel et poivre", "quantity": 1, "unit": "pincee"}]}',
    '{"steps": ["Battre les oeufs avec les herbes hachees", "Faire fondre le beurre dans une poele", "Verser les oeufs et cuire a feu moyen", "Replier l''omelette et servir"]}', 1, 2, 'https://example.com/images/herb_omelette.jpg'),
    
  ('Riz aux legumes', 'Plat de riz simple et nutritif, ideal pour toute la famille.', 15, 25, 'easy', 'dinner', 'all', false, NULL,
    '{"ingredients": [{"name": "riz", "quantity": 200, "unit": "g"}, {"name": "carottes", "quantity": 2, "unit": "piece"}, {"name": "petits pois", "quantity": 100, "unit": "g"}, {"name": "oignon", "quantity": 1, "unit": "piece"}, {"name": "bouillon de legumes", "quantity": 500, "unit": "ml"}]}',
    '{"steps": ["Faire revenir l''oignon emince", "Ajouter les carottes coupees en des", "Incorporer le riz et faire nacrer", "Verser le bouillon chaud et cuire 18 minutes", "Ajouter les petits pois en fin de cuisson"]}', 4, 3, 'https://example.com/images/vegetable_rice.jpg'),
    
  ('Smoothie aux fruits rouges', 'Boisson rafraichissante et vitaminee.', 10, 0, 'easy', 'breakfast', 'summer', false, NULL,
    '{"ingredients": [{"name": "fraises", "quantity": 150, "unit": "g"}, {"name": "framboises", "quantity": 100, "unit": "g"}, {"name": "yaourt", "quantity": 200, "unit": "g"}, {"name": "miel", "quantity": 1, "unit": "cuillere a soupe"}, {"name": "jus d''orange", "quantity": 100, "unit": "ml"}]}',
    '{"steps": ["Rincer les fruits rouges", "Mettre tous les ingredients dans un blender", "Mixer jusqu''a obtenir une texture lisse", "Servir immediatement"]}', 2, 3, 'https://example.com/images/berry_smoothie.jpg');

-- 4.3 Recettes premium (réservées aux abonnés)
-- 4.3 Recettes premium (reservees aux abonnes)
INSERT INTO recipes (title, description, prep_time, cook_time, difficulty_level, meal_type, season, is_premium, premium_rank, ingredients, steps, servings, author_id, image_url)
VALUES
  ('Risotto aux champignons sauvages', 'Risotto cremeux aux champignons des bois et parmesan.', 20, 30, 'medium', 'dinner', 'autumn', true, 1,
    '{"ingredients": [{"name": "riz arborio", "quantity": 300, "unit": "g"}, {"name": "champignons des bois", "quantity": 250, "unit": "g"}, {"name": "echalote", "quantity": 2, "unit": "piece"}, {"name": "vin blanc sec", "quantity": 100, "unit": "ml"}, {"name": "bouillon de volaille", "quantity": 1, "unit": "litre"}, {"name": "parmesan", "quantity": 80, "unit": "g"}, {"name": "beurre", "quantity": 50, "unit": "g"}, {"name": "huile d''olive", "quantity": 2, "unit": "cuillere a soupe"}, {"name": "thym", "quantity": 2, "unit": "brins"}]}',
    '{"steps": ["Faire chauffer le bouillon", "Faire revenir les echalotes dans l''huile et le beurre", "Ajouter les champignons et le thym, cuire 5 minutes", "Ajouter le riz et faire nacrer 2 minutes", "Deglacerau vin blanc", "Ajouter le bouillon louche par louche en remuant constamment", "En fin de cuisson, ajouter le parmesan rape et le reste du beurre", "Laisser reposer 2 minutes avant de servir"]}', 4, 1, 'https://example.com/images/mushroom_risotto.jpg'),
    
  ('Filet de boeuf Wellington', 'Elegant filet de boeuf en croute avec duxelles de champignons.', 60, 45, 'hard', 'dinner', 'winter', true, 2,
    '{"ingredients": [{"name": "filet de boeuf", "quantity": 800, "unit": "g"}, {"name": "pate feuilletee", "quantity": 1, "unit": "rouleau"}, {"name": "champignons de Paris", "quantity": 400, "unit": "g"}, {"name": "echalotes", "quantity": 2, "unit": "piece"}, {"name": "jambon de Parme", "quantity": 6, "unit": "tranches"}, {"name": "jaune d''oeuf", "quantity": 1, "unit": "piece"}, {"name": "moutarde a l''ancienne", "quantity": 2, "unit": "cuillere a soupe"}, {"name": "thym", "quantity": 2, "unit": "brins"}, {"name": "huile d''olive", "quantity": 2, "unit": "cuillere a soupe"}]}',
    '{"steps": ["Saisir le filet de boeuf sur toutes ses faces", "Preparer la duxelles: mixer les champignons avec les echalotes et faire revenir", "Badigeonner le filet de moutarde", "Etaler la pate feuilletee, disposer les tranches de jambon", "Etaler la duxelles sur le jambon", "Placer le filet et refermer la pate", "Badigeonner de jaune d''oeuf", "Cuire au four a 200°C pendant 35-40 minutes"]}', 6, 1, 'https://example.com/images/beef_wellington.jpg'),
    
  ('Souffle au chocolat', 'Dessert elegant et aerien au chocolat noir.', 30, 15, 'hard', 'dessert', 'all', true, 3,
    '{"ingredients": [{"name": "chocolat noir", "quantity": 200, "unit": "g"}, {"name": "beurre", "quantity": 50, "unit": "g"}, {"name": "oeufs", "quantity": 6, "unit": "piece"}, {"name": "sucre", "quantity": 100, "unit": "g"}, {"name": "farine", "quantity": 20, "unit": "g"}, {"name": "beurre et sucre pour les ramequins", "quantity": 1, "unit": "cuillere a soupe"}]}',
    '{"steps": ["Prechauffer le four a 200°C", "Beurrer et sucrer les ramequins", "Faire fondre le chocolat avec le beurre au bain-marie", "Separer les blancs des jaunes", "Melanger les jaunes avec la moitie du sucre, puis avec le chocolat fondu", "Incorporer delicatement la farine", "Monter les blancs en neige avec le reste du sucre", "Incorporer delicatement les blancs a la preparation au chocolat", "Remplir les ramequins et enfourner 10-12 minutes"]}', 6, 3, 'https://example.com/images/chocolate_souffle.jpg'),
    
  ('Poke bowl au saumon', 'Bowl hawaien frais et equilibre au saumon marine.', 25, 15, 'medium', 'lunch', 'summer', true, 4,
    '{"ingredients": [{"name": "filet de saumon frais", "quantity": 300, "unit": "g"}, {"name": "riz a sushi", "quantity": 250, "unit": "g"}, {"name": "avocat", "quantity": 1, "unit": "piece"}, {"name": "concombre", "quantity": 1, "unit": "piece"}, {"name": "carotte", "quantity": 1, "unit": "piece"}, {"name": "edamame", "quantity": 100, "unit": "g"}, {"name": "sauce soja", "quantity": 4, "unit": "cuillere a soupe"}, {"name": "huile de sesame", "quantity": 1, "unit": "cuillere a soupe"}, {"name": "graines de sesame", "quantity": 2, "unit": "cuillere a soupe"}, {"name": "algue nori", "quantity": 1, "unit": "feuille"}]}',
    '{"steps": ["Cuire le riz selon les instructions", "Couper le saumon en cubes et le mariner dans la sauce soja et l''huile de sesame", "Preparer tous les legumes: couper l''avocat et le concombre en tranches, raper la carotte", "Dresser le riz dans des bols", "Disposer harmonieusement le saumon et les legumes", "Parsemer de graines de sesame et de lanieres d''algue nori"]}', 2, 1, 'https://example.com/images/salmon_poke_bowl.jpg'),
    
  ('Tarte tatin aux figues et romarin', 'Variation gourmande de la tarte tatin traditionnelle avec des figues fraiches.', 30, 35, 'medium', 'dessert', 'autumn', true, 5,
    '{"ingredients": [{"name": "figues fraiches", "quantity": 12, "unit": "piece"}, {"name": "pate feuilletee", "quantity": 1, "unit": "rouleau"}, {"name": "sucre", "quantity": 150, "unit": "g"}, {"name": "beurre", "quantity": 80, "unit": "g"}, {"name": "romarin frais", "quantity": 2, "unit": "brins"}, {"name": "miel", "quantity": 2, "unit": "cuillere a soupe"}]}',
    '{"steps": ["Prechauffer le four a 180°C", "Couper les figues en deux", "Dans une poele allant au four, faire un caramel avec le sucre et le beurre", "Ajouter le romarin emiette et le miel", "Disposer les figues face coupee vers le bas", "Recouvrir de pate feuilletee en rentrant les bords", "Enfourner pendant 30 minutes", "Laisser tiedir et retourner sur un plat"]}', 8, 1, 'https://example.com/images/fig_tarte_tatin.jpg');

-- 5. Insertion des menus hebdomadaires
-- 5. Insertion des menus hebdomadaires
INSERT INTO weekly_menus (user_id, meal_schedule, menu_type, valid_from, valid_to, is_customized, family_size)
VALUES
  (2, '{"monday": {"breakfast": {"recipe_id": 1, "title": "Puree de banane"}, "lunch": {"recipe_id": 3, "title": "Puree de carottes"}, "dinner": {"recipe_id": 5, "title": "Puree de patate douce"}},
    "tuesday": {"breakfast": {"recipe_id": 2, "title": "Compote de pomme"}, "lunch": {"recipe_id": 4, "title": "Puree de petits pois"}, "dinner": {"recipe_id": 3, "title": "Puree de carottes"}}}',
  'weekly', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', false, 3),
  
  (3, '{"wednesday": {"breakfast": {"recipe_id": 8, "title": "Omelette aux herbes"}, "lunch": {"recipe_id": 7, "title": "Salade de concombre"}, "dinner": {"recipe_id": 9, "title": "Riz aux legumes"}},
    "thursday": {"breakfast": {"recipe_id": 10, "title": "Smoothie aux fruits rouges"}, "lunch": {"recipe_id": 9, "title": "Riz aux legumes"}, "dinner": {"recipe_id": 11, "title": "Risotto aux champignons sauvages"}}}',
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
  ('{"welcome_message": "Bienvenue sur Menu Planner - Votre assistant pour des repas equilibres en famille", 
    "hero_image": "https://example.com/images/hero.jpg",
    "headline": "Planifiez vos repas facilement pour toute la famille",
    "subheadline": "Recettes adaptees a tous les ages, restrictions alimentaires prises en compte"}',
  '[
    {"title": "Recettes adaptees", "description": "Des recettes adaptees a tous les membres de votre famille", "icon": "family"},
    {"title": "Planification automatique", "description": "Creation automatique de menus hebdomadaires equilibres", "icon": "calendar"},
    {"title": "Aliments de saison", "description": "Privilegie les ingredients de saison pour une alimentation plus responsable", "icon": "leaf"},
    {"title": "Restrictions alimentaires", "description": "Prend en compte toutes vos restrictions et preferences", "icon": "filter"}
  ]',
  '[
    {"id": "monthly", "name": "Abonnement Mensuel", "price": "9.99€", "interval": "mois", "features": ["Acces a toutes les recettes", "Generation de menus illimitee", "Support personnalise"]},
    {"id": "annual", "name": "Abonnement Annuel", "price": "99.90€", "interval": "an", "features": ["Acces a toutes les recettes", "Generation de menus illimitee", "Support personnalise", "Economisez 17% par rapport au tarif mensuel"]}
  ]',
  '[
    {"question": "Comment fonctionne le generateur de menus ?", "answer": "Notre generateur utilise vos preferences, restrictions alimentaires et la composition de votre foyer pour creer des menus adaptes et equilibres."},
    {"question": "Y a-t-il une version gratuite ?", "answer": "Oui, vous pouvez utiliser gratuitement le generateur de menus et acceder a une selection de 50 recettes sans abonnement."},
    {"question": "Puis-je annuler mon abonnement a tout moment ?", "answer": "Oui, vous pouvez annuler votre abonnement quand vous le souhaitez. Vous conserverez l''acces jusqu''a la fin de la periode payee."}
  ]');

COMMIT;