-- Fichier pour ajouter de nouvelles recettes
-- À exécuter après avoir initialisé la base de données

INSERT INTO recipes (
    title, 
    description, 
    prep_time, 
    cook_time, 
    difficulty_level, 
    meal_type, 
    season, 
    is_premium, 
    premium_rank, 
    ingredients, 
    steps, 
    servings, 
    author_id, 
    image_url
)
VALUES
-- RECETTE 1
(
    'Ratatouille provençale', 
    'Un classique de la cuisine provençale, parfait comme plat principal ou accompagnement.', 
    30, 
    60, 
    'medium', 
    'dinner', 
    'summer', 
    false, 
    NULL,
    '[
        {"name": "aubergine", "quantity": 1, "unit": "pièce"}, 
        {"name": "courgette", "quantity": 2, "unit": "pièce"}, 
        {"name": "poivron rouge", "quantity": 1, "unit": "pièce"}, 
        {"name": "poivron jaune", "quantity": 1, "unit": "pièce"}, 
        {"name": "tomates", "quantity": 4, "unit": "pièce"}, 
        {"name": "oignon", "quantity": 2, "unit": "pièce"}, 
        {"name": "gousse d''ail", "quantity": 3, "unit": "pièce"}, 
        {"name": "herbes de Provence", "quantity": 2, "unit": "cuillère à café"}, 
        {"name": "huile d''olive", "quantity": 4, "unit": "cuillère à soupe"}, 
        {"name": "sel", "quantity": 1, "unit": "pincée"}, 
        {"name": "poivre", "quantity": 1, "unit": "pincée"}
    ]',
    '[
        {"category": "Préparation", "instructions": [
            "Laver et couper tous les légumes en cubes de taille moyenne", 
            "Faire revenir l''oignon et l''ail dans l''huile d''olive", 
            "Ajouter les poivrons et les faire revenir 5 minutes", 
            "Ajouter les courgettes et l''aubergine, poursuivre la cuisson 10 minutes", 
            "Incorporer les tomates, les herbes, le sel et le poivre", 
            "Laisser mijoter à couvert pendant 45 minutes à feu doux", 
            "Servir chaud ou tiède"
        ]}
    ]', 
    4, 
    1, 
    'https://example.com/images/ratatouille.jpg'
),

-- RECETTE 2
(
    'Tarte aux pommes à la cannelle', 
    'Une délicieuse tarte aux pommes parfumée à la cannelle, idéale pour le dessert.', 
    30, 
    45, 
    'medium', 
    'dessert', 
    'autumn', 
    false, 
    NULL,
    '[
        {"name": "pâte brisée", "quantity": 1, "unit": "rouleau"}, 
        {"name": "pommes", "quantity": 6, "unit": "pièce"}, 
        {"name": "sucre", "quantity": 100, "unit": "g"}, 
        {"name": "cannelle", "quantity": 2, "unit": "cuillère à café"}, 
        {"name": "beurre", "quantity": 50, "unit": "g"}, 
        {"name": "jus de citron", "quantity": 1, "unit": "cuillère à soupe"}
    ]',
    '[
        {"category": "Préparation de la tarte", "instructions": [
            "Préchauffer le four à 180°C", 
            "Étaler la pâte brisée dans un moule à tarte", 
            "Piquer le fond avec une fourchette"
        ]},
        {"category": "Préparation de la garniture", "instructions": [
            "Éplucher et couper les pommes en fines tranches", 
            "Arroser les pommes de jus de citron pour éviter qu''elles noircissent", 
            "Mélanger le sucre et la cannelle"
        ]},
        {"category": "Assemblage et cuisson", "instructions": [
            "Disposer les tranches de pommes sur la pâte", 
            "Saupoudrer du mélange sucre-cannelle", 
            "Répartir des petits morceaux de beurre sur le dessus", 
            "Enfourner pour 45 minutes jusqu''à ce que la tarte soit dorée", 
            "Laisser refroidir avant de servir"
        ]}
    ]', 
    8, 
    1, 
    'https://example.com/images/apple_cinnamon_pie.jpg'
),

-- RECETTE 3 (PREMIUM)
(
    'Lasagnes à la truffe et aux champignons sauvages', 
    'Une version luxueuse et raffinée des lasagnes traditionnelles, parfumée à la truffe.', 
    45, 
    60, 
    'hard', 
    'dinner', 
    'winter', 
    true, 
    1,
    '[
        {"name": "feuilles de lasagne", "quantity": 12, "unit": "pièce"}, 
        {"name": "champignons sauvages variés", "quantity": 500, "unit": "g"}, 
        {"name": "échalotes", "quantity": 3, "unit": "pièce"}, 
        {"name": "beurre", "quantity": 80, "unit": "g"}, 
        {"name": "farine", "quantity": 50, "unit": "g"}, 
        {"name": "lait", "quantity": 800, "unit": "ml"}, 
        {"name": "crème fraîche", "quantity": 200, "unit": "ml"}, 
        {"name": "parmesan râpé", "quantity": 150, "unit": "g"}, 
        {"name": "huile de truffe", "quantity": 2, "unit": "cuillère à café"}, 
        {"name": "truffe fraîche", "quantity": 1, "unit": "petite"}, 
        {"name": "thym frais", "quantity": 4, "unit": "brins"}, 
        {"name": "sel", "quantity": 1, "unit": "pincée"}, 
        {"name": "poivre", "quantity": 1, "unit": "pincée"}
    ]',
    '[
        {"category": "Préparation des champignons", "instructions": [
            "Nettoyer les champignons sauvages", 
            "Émincer finement les échalotes", 
            "Faire fondre 30g de beurre dans une poêle", 
            "Faire revenir les échalotes puis ajouter les champignons", 
            "Cuire à feu vif jusqu''à évaporation de l''eau", 
            "Ajouter le thym, saler et poivrer", 
            "Réserver"
        ]},
        {"category": "Préparation de la béchamel à la truffe", "instructions": [
            "Faire fondre 50g de beurre dans une casserole", 
            "Ajouter la farine et mélanger pour former un roux", 
            "Verser le lait progressivement en fouettant", 
            "Cuire à feu doux jusqu''à épaississement", 
            "Ajouter la crème fraîche et 100g de parmesan", 
            "Incorporer l''huile de truffe", 
            "Râper un peu de truffe fraîche dans la sauce"
        ]},
        {"category": "Montage et cuisson", "instructions": [
            "Préchauffer le four à 180°C", 
            "Dans un plat à gratin, alterner: sauce, pâtes, champignons", 
            "Terminer par une couche de sauce et le reste de parmesan", 
            "Râper le reste de la truffe sur le dessus", 
            "Cuire au four pendant 45-60 minutes", 
            "Laisser reposer 10 minutes avant de servir"
        ]}
    ]', 
    6, 
    1, 
    'https://example.com/images/truffle_mushroom_lasagna.jpg'
);

-- Vous pouvez ajouter d'autres recettes en suivant ce modèle