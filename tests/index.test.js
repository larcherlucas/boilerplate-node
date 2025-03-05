// tests/index.test.js
import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import supertest from 'supertest';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import app
import app from '../index.js';

// Créer une instance supertest
const request = supertest(app);

// Récupérer la clé privée pour générer des JWT de test
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const privateKeyPath = path.join(__dirname, '..', 'app', 'keys', 'private.key');
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

// Pool de connexion à la base de données pour les tests
const pool = global.testDbPool;

// Utilitaires de test
const generateTestToken = (userId, role = 'user', expiresIn = '2h') => {
  return jwt.sign(
    { userId, role },
    privateKey,
    { algorithm: 'RS256', expiresIn }
  );
};

// Initialisation de la base de données de test
async function resetTestDb() {
  const client = await pool.connect();
  try {
    // Lire et exécuter les scripts SQL
    const createTables = fs.readFileSync(path.join(__dirname, '../app/data/tables.sql'), 'utf8');
    const insertTestData = fs.readFileSync(path.join(__dirname, '../app/data/test.sql'), 'utf8');
    
    await client.query('BEGIN');
    await client.query(createTables);
    await client.query(insertTestData);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la réinitialisation de la base de données de test:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Tests
describe('API MenuPlanner', () => {
  // Exécuter une fois avant tous les tests
  before(async () => {
    console.log('Initialisation de la base de données de test...');
    await resetTestDb();
  });

  // Tests d'authentification
  describe('Authentication', () => {
    describe('POST /api/v1/signup', () => {
      it('devrait créer un nouveau compte utilisateur', async () => {
        const newUser = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test1234!',
          confirmPassword: 'Test1234!'
        };

        const response = await request
          .post('/api/v1/signup')
          .send(newUser)
          .expect('Content-Type', /json/)
          .expect(201);

        expect(response.body.status).to.equal('success');
        expect(response.body.data.user).to.have.property('id');
        expect(response.body.data.user.email).to.equal(newUser.email);
        expect(response.body.data.token).to.be.a('string');
      });

      it('devrait retourner une erreur si l\'email est déjà utilisé', async () => {
        const existingUser = {
          username: 'existinguser',
          email: 'admin@example.com', // Email déjà utilisé dans le jeu de test
          password: 'Test1234!',
          confirmPassword: 'Test1234!'
        };

        const response = await request
          .post('/api/v1/signup')
          .send(existingUser)
          .expect('Content-Type', /json/)
          .expect(409);

        expect(response.body.status).to.equal('error');
        expect(response.body.message).to.include('déjà utilisé');
      });
    });

    describe('POST /api/v1/login', () => {
      it('devrait connecter un utilisateur existant', async () => {
        const loginCredentials = {
          email: 'family2@example.com',
          password: 'Test1234!' // Remplacer par le mot de passe correct du jeu de test
        };

        const response = await request
          .post('/api/v1/login')
          .send(loginCredentials)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.status).to.equal('success');
        expect(response.body.data.user).to.have.property('id');
        expect(response.body.data.token).to.be.a('string');
      });

      it('devrait retourner une erreur pour des identifiants incorrects', async () => {
        const wrongCredentials = {
          email: 'wrong@example.com',
          password: 'WrongPassword123!'
        };

        const response = await request
          .post('/api/v1/login')
          .send(wrongCredentials)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body.status).to.equal('error');
      });
    });

    describe('POST /api/v1/logout', () => {
      it('devrait déconnecter un utilisateur authentifié', async () => {
        const token = generateTestToken(3); // ID de l'utilisateur family2

        const response = await request
          .post('/api/v1/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.status).to.equal('success');
        expect(response.body.message).to.include('Déconnexion réussie');
      });
    });
  });

  // Tests du profil utilisateur
  describe('User Profile', () => {
    let userToken;

    beforeEach(() => {
      userToken = generateTestToken(3); // ID de l'utilisateur family2
    });

    describe('GET /api/v1/account/me', () => {
      it('devrait récupérer le profil de l\'utilisateur connecté', async () => {
        const response = await request
          .get('/api/v1/account/me')
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.status).to.equal('success');
        expect(response.body.data).to.have.property('id', 3);
        expect(response.body.data).to.have.property('email', 'family2@example.com');
      });
    });

    describe('PATCH /api/v1/account/me', () => {
      it('devrait mettre à jour le profil de l\'utilisateur', async () => {
        const updateData = {
          preferences: {
            theme: 'dark',
            notifications: {
              email: false,
              app: true
            }
          }
        };

        const response = await request
          .patch('/api/v1/account/me')
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateData)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.status).to.equal('success');
        expect(response.body.data.preferences).to.deep.include(updateData.preferences);
      });
    });

    describe('GET /api/v1/account/me/dietary-restrictions', () => {
      it('devrait récupérer les restrictions alimentaires de l\'utilisateur', async () => {
        const response = await request
          .get('/api/v1/account/me/dietary-restrictions')
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.status).to.equal('success');
        expect(response.body.data).to.be.an('array');
        // Vérifier la présence de la restriction "vegetarian" pour family2
        expect(response.body.data.some(r => r.restriction_type === 'vegetarian')).to.be.true;
      });
    });

    describe('POST /api/v1/account/me/dietary-restrictions', () => {
      it('devrait ajouter une restriction alimentaire', async () => {
        const newRestriction = {
          restriction_type: 'lactose-free',
          details: 'Intolérance au lactose'
        };

        const response = await request
          .post('/api/v1/account/me/dietary-restrictions')
          .set('Authorization', `Bearer ${userToken}`)
          .send(newRestriction)
          .expect('Content-Type', /json/)
          .expect(201);

        expect(response.body.status).to.equal('success');
        expect(response.body.data.restriction_type).to.equal(newRestriction.restriction_type);
      });
    });
  });

  // Tests des recettes
  describe('Recipes', () => {
    let userToken;
    let adminToken;

    beforeEach(() => {
      userToken = generateTestToken(3); // ID de l'utilisateur family2
      adminToken = generateTestToken(1, 'admin'); // ID de l'administrateur
    });

    describe('GET /api/v1/recipes', () => {
      it('devrait récupérer toutes les recettes accessibles à l\'utilisateur', async () => {
        const response = await request
          .get('/api/v1/recipes')
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.status).to.equal('success');
        expect(response.body.data).to.be.an('array');
        expect(response.body.data.length).to.be.at.least(1);
      });

      it('devrait filtrer les recettes par type de repas', async () => {
        const response = await request
          .get('/api/v1/recipes?meal_type=breakfast')
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.status).to.equal('success');
        expect(response.body.data).to.be.an('array');
        expect(response.body.data.every(recipe => recipe.meal_type === 'breakfast')).to.be.true;
      });
    });

    describe('GET /api/v1/recipes/:id', () => {
      it('devrait récupérer une recette spécifique', async () => {
        const recipeId = 7; // ID d'une recette non-premium dans le jeu de test

        const response = await request
          .get(`/api/v1/recipes/${recipeId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.status).to.equal('success');
        expect(response.body.data).to.have.property('id', recipeId);
      });

      it('devrait refuser l\'accès à une recette premium pour un utilisateur sans abonnement', async () => {
        const premiumRecipeId = 11; // ID d'une recette premium dans le jeu de test
        const nonPremiumToken = generateTestToken(2); // ID de l'utilisateur family1 (sans abonnement)

        const response = await request
          .get(`/api/v1/recipes/${premiumRecipeId}`)
          .set('Authorization', `Bearer ${nonPremiumToken}`)
          .expect('Content-Type', /json/)
          .expect(403);

        expect(response.body.error).to.include('premium');
      });
    });

    describe('POST /api/v1/recipes', () => {
      it('devrait créer une nouvelle recette', async () => {
        const newRecipe = {
          title: 'Salade Grecque',
          description: 'Une salade fraîche et légère avec des ingrédients méditerranéens.',
          prep_time: 15,
          cook_time: 0,
          difficulty_level: 'easy',
          meal_type: 'lunch',
          season: 'summer',
          is_premium: false,
          ingredients: [
            { name: 'concombre', quantity: 1, unit: 'pièce' },
            { name: 'tomate', quantity: 2, unit: 'pièce' },
            { name: 'feta', quantity: 100, unit: 'g' },
            { name: 'olives noires', quantity: 50, unit: 'g' },
            { name: 'huile d\'olive', quantity: 2, unit: 'cuillère à soupe' }
          ],
          steps: [
            { order: 1, description: 'Laver et couper les légumes en dés' },
            { order: 2, description: 'Émietter la feta' },
            { order: 3, description: 'Mélanger tous les ingrédients et assaisonner' }
          ],
          servings: 2
        };

        const response = await request
          .post('/api/v1/recipes')
          .set('Authorization', `Bearer ${userToken}`)
          .send(newRecipe)
          .expect('Content-Type', /json/)
          .expect(201);

        expect(response.body.status).to.equal('success');
        expect(response.body.data).to.have.property('id');
        expect(response.body.data.title).to.equal(newRecipe.title);
      });
    });
  });

  // Tests des menus
  describe('Menus', () => {
    let userToken;

    beforeEach(() => {
      userToken = generateTestToken(3); // ID de l'utilisateur family2
    });

    describe('GET /api/v1/weekly-menus', () => {
      it('devrait récupérer les menus hebdomadaires de l\'utilisateur', async () => {
        const response = await request
          .get('/api/v1/weekly-menus')
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body).to.be.an('array');
        expect(response.body.length).to.be.at.least(1);
      });
    });

    describe('POST /api/v1/weekly-menus/generate', () => {
      it('devrait générer un nouveau menu hebdomadaire', async () => {
        const menuOptions = {
          numberOfMeals: 3,
          numberOfDays: 5,
          includeFavorites: true,
          familySize: 2,
          startDate: new Date().toISOString().split('T')[0],
          mealTypes: ['breakfast', 'lunch', 'dinner']
        };

        const response = await request
          .post('/api/v1/weekly-menus/generate')
          .set('Authorization', `Bearer ${userToken}`)
          .send(menuOptions)
          .expect('Content-Type', /json/)
          .expect(201);

        expect(response.body.status).to.equal('success');
        expect(response.body.data).to.have.property('id');
        expect(response.body.data).to.have.property('meal_schedule');
        expect(response.body.data.family_size).to.equal(menuOptions.familySize);
      });
    });
  });

  // Tests des favoris
  describe('Favorites', () => {
    let userToken;

    beforeEach(() => {
      userToken = generateTestToken(3); // ID de l'utilisateur family2
    });

    describe('GET /api/v1/favorites', () => {
      it('devrait récupérer les recettes favorites de l\'utilisateur', async () => {
        const response = await request
          .get('/api/v1/favorites')
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.status).to.equal('success');
        expect(response.body.data).to.be.an('array');
        expect(response.body.data.length).to.be.at.least(1);
      });
    });

    describe('POST /api/v1/favorites', () => {
      it('devrait ajouter une recette aux favoris', async () => {
        const recipeId = 7; // ID d'une recette non-premium dans le jeu de test

        const response = await request
          .post('/api/v1/favorites')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ recipe_id: recipeId })
          .expect('Content-Type', /json/)
          .expect(201);

        expect(response.body.status).to.equal('success');
        expect(response.body.data).to.have.property('recipe_id', recipeId);
      });

      it('devrait refuser l\'ajout d\'une recette premium aux favoris pour un utilisateur sans abonnement', async () => {
        const premiumRecipeId = 12; // ID d'une recette premium dans le jeu de test
        const nonPremiumToken = generateTestToken(2); // ID de l'utilisateur family1 (sans abonnement)

        const response = await request
          .post('/api/v1/favorites')
          .set('Authorization', `Bearer ${nonPremiumToken}`)
          .send({ recipe_id: premiumRecipeId })
          .expect('Content-Type', /json/)
          .expect(403);

        expect(response.body.status).to.equal('error');
        expect(response.body.message).to.include('premium');
      });
    });

    describe('DELETE /api/v1/favorites/:recipeId', () => {
      it('devrait supprimer une recette des favoris', async () => {
        const recipeId = 11; // ID d'une recette favorite dans le jeu de test

        const response = await request
          .delete(`/api/v1/favorites/${recipeId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(204);
      });
    });
  });

  // Tests des abonnements
  describe('Subscriptions', () => {
    let userToken;
    let adminToken;

    beforeEach(() => {
      userToken = generateTestToken(2); // ID de l'utilisateur family1 (sans abonnement)
      adminToken = generateTestToken(1, 'admin'); // ID de l'administrateur
    });

    describe('GET /api/v1/subscription-plans', () => {
      it('devrait récupérer tous les plans d\'abonnement disponibles', async () => {
        const response = await request
          .get('/api/v1/subscription-plans')
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.status).to.equal('success');
        expect(response.body.data).to.be.an('array');
        expect(response.body.data.length).to.be.at.least(1);
      });
    });

    describe('GET /api/v1/subscription/status', () => {
      it('devrait vérifier le statut d\'abonnement de l\'utilisateur', async () => {
        const response = await request
          .get('/api/v1/subscription/status')
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.status).to.equal('success');
        expect(response.body.data).to.have.property('subscription');
        expect(response.body.data.subscription).to.have.property('active');
        expect(response.body.data.subscription).to.have.property('type');
      });
    });

    describe('POST /api/v1/payment/subscription', () => {
      it('devrait créer un abonnement pour l\'utilisateur', async () => {
        // Note: Ce test nécessite généralement un mock de Stripe
        const subscriptionData = {
          priceId: 'price_monthly', // ID du plan dans le jeu de test
          couponCode: null
        };

        // Ce test sera incomplet sans mock Stripe, mais vérifions au moins le format de la requête
        const response = await request
          .post('/api/v1/payment/subscription')
          .set('Authorization', `Bearer ${userToken}`)
          .send(subscriptionData)
          .expect('Content-Type', /json/);

        // Le code peut être 200 ou 400 selon la configuration de test
      });
    });
  });

  // Tests des restrictions alimentaires
  describe('Dietary Restrictions', () => {
    let userToken;

    beforeEach(() => {
      userToken = generateTestToken(2); // ID de l'utilisateur family1
    });

    describe('GET /api/v1/dietary-restrictions', () => {
      it('devrait récupérer toutes les restrictions alimentaires de l\'utilisateur', async () => {
        const response = await request
          .get('/api/v1/dietary-restrictions')
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body).to.be.an('array');
        expect(response.body.length).to.be.at.least(1);
        expect(response.body.some(r => r.restriction_type === 'pork-free')).to.be.true;
      });
    });
  });

  // Nettoyer après tous les tests
  after(async () => {
    // Fermer la connexion au pool à la fin
    await pool.end();
  });
});