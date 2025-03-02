import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import accountDataMapper from '../datamappers/account.js';
import ApiError from '../erros/api.error.js';
import generateToken from '../utils/generateToken.js';
import cryptoPassword from '../utils/cryptoPassword.js';
import formatUserResponse from '../utils/formatUserResponse.js';

// Récupération de la clé publique
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let publicKey;

try {
  // Essayer d'abord avec la variable d'environnement
  const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH
    ? process.env.JWT_PUBLIC_KEY_PATH.startsWith('./app')
      ? path.join(__dirname, '..', process.env.JWT_PUBLIC_KEY_PATH.substring(5))
      : process.env.JWT_PUBLIC_KEY_PATH
    : path.join(__dirname, '..', 'keys', 'public.key');

  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  console.log("Clé publique chargée avec succès pour account.js");
} catch (error) {
  console.error('Erreur lors du chargement de la clé publique dans account.js:', error);
  // Tentative de chemin alternatif
  try {
    const alternativePath = path.join(__dirname, '..', 'keys', 'public.key');
    publicKey = fs.readFileSync(alternativePath, 'utf8');
    console.log("Clé publique chargée depuis le chemin alternatif dans account.js");
  } catch (altError) {
    console.error('Échec du chargement depuis le chemin alternatif dans account.js:', altError);
    throw new Error('Impossible de charger la clé publique JWT dans account.js');
  }
}

// Configuration pour les mots de passe
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\w\d!@#$%^&*()-_+=]{8,}$/;

// Préférences par défaut
const DEFAULT_PREFERENCES = {
  language: 'fr',
  theme: 'light',
  notifications: {
    email: true,
    app: true
  }
};

const accountController = {
  getAllAccounts: async (req, res) => {
    try {
      // Vérifier si l'utilisateur est admin
      if (req.user.role !== 'admin') {
        throw new ApiError(403, 'Accès réservé aux administrateurs');
      }
      
      const accounts = await accountDataMapper.findAllAccounts();
      
      if (!accounts) {
        throw new ApiError(404, 'Aucun compte trouvé');
      }
      
      return res.status(200).json({
        status: 'success',
        data: accounts
      });
    } catch (err) {
      throw err;
    }
  },

  getOneAccount: async (req, res) => {
    try {
      const accountId = parseInt(req.params.id, 10);
      
      // Vérifier si l'utilisateur demande son propre compte ou s'il est admin
      if (req.user.id !== accountId && req.user.role !== 'admin') {
        throw new ApiError(403, 'Vous n\'êtes pas autorisé à accéder à ce compte');
      }
      
      const account = await accountDataMapper.findOneAccount(accountId);

      if (!account) {
        throw new ApiError(404, 'Compte non trouvé');
      }

      return res.status(200).json({
        status: 'success',
        data: account
      });
    } catch (err) {
      throw err;
    }
  },

  createAccount: async (req, res) => {
    try {
      const { username, email, password, confirmPassword, household_members, preferences } = req.body;
  
      // Journalisation en développement uniquement
      if (process.env.NODE_ENV === 'development') {
        console.log('Requête d\'inscription reçue:', { 
          username, 
          email, 
          household_members, 
          preferences,
          hasPassword: !!password,
          hasConfirmPassword: !!confirmPassword
        });
      }
      
      // Vérifications des données obligatoires
      if (!username) {
        throw new ApiError(400, "Le nom d'utilisateur est requis");
      }
      
      if (!email) {
        throw new ApiError(400, "L'adresse email est requise");
      }
      
      if (!password) {
        throw new ApiError(400, "Le mot de passe est requis");
      }
      
      // Normalisation de l'email
      const normalizedEmail = email.trim().toLowerCase();
      
      // Vérification de la correspondance des mots de passe
      if (password !== confirmPassword) {
        throw new ApiError(400, "Les mots de passe ne correspondent pas");
      }
      
      // Vérification de la complexité du mot de passe
      if (password.length < PASSWORD_MIN_LENGTH) {
        throw new ApiError(400, `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`);
      }
      
      if (!PASSWORD_REGEX.test(password)) {
        throw new ApiError(400, "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre");
      }
  
      // Vérifier si l'email existe déjà
      const existingUser = await accountDataMapper.findByEmail(normalizedEmail);
      if (existingUser) {
        throw new ApiError(409, 'Cet email est déjà utilisé');
      }
      
      // Fusion des préférences par défaut avec les préférences fournies
      const mergedPreferences = { ...DEFAULT_PREFERENCES, ...(preferences || {}) };
      
      // Préparation des données utilisateur
      const userData = {
        username,
        email: normalizedEmail,
        password,
        role: 'user',
        household_members: household_members || {
          adults: 0,
          children_over_3: 0,
          children_under_3: 0,
          babies: 0
        },
        preferences: mergedPreferences,
        subscription: {
          type: null,
          status: 'inactive',
          startDate: null,
          endDate: null
        }
      };
  
      // Créer le nouvel utilisateur
      const newAccount = await accountDataMapper.createAccount(userData);
      
      if (!newAccount) {
        throw new ApiError(500, "Échec de la création du compte utilisateur");
      }
  
      // Générer un token JWT
      const token = generateToken(newAccount);
      
      // Journalisation en développement uniquement
      if (process.env.NODE_ENV === 'development') {
        console.log('Compte créé avec succès:', { id: newAccount.id, username: newAccount.username });
      }
  
      return res.status(201).json({
        status: 'success',
        data: {
          user: formatUserResponse(newAccount),
          token
        }
      });
    } catch (err) {
      // Log détaillé de l'erreur en développement
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur lors de la création de compte:', err);
      }
      throw err;
    }
  },

  updateAccount: async (req, res) => {
    try {
      const accountId = parseInt(req.params.id, 10);
      
      // Vérifier si l'utilisateur modifie son propre compte ou s'il est admin
      if (req.user.id !== accountId && req.user.role !== 'admin') {
        throw new ApiError(403, 'Vous n\'êtes pas autorisé à modifier ce compte');
      }
      
      // Si le mot de passe est fourni, le hasher
      if (req.body.password) {
        // Vérification du confirm password
        if (req.body.password !== req.body.confirmPassword) {
          throw new ApiError(400, "Les mots de passe ne correspondent pas");
        }
        
        // Vérification de la complexité du mot de passe
        if (req.body.password.length < PASSWORD_MIN_LENGTH) {
          throw new ApiError(400, `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`);
        }
        
        if (!PASSWORD_REGEX.test(req.body.password)) {
          throw new ApiError(400, "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre");
        }
        
        const saltRounds = 10;
        req.body.password_hash = await bcrypt.hash(req.body.password, saltRounds);
        delete req.body.password;
        delete req.body.confirmPassword;
      }
      
      // Normalisation de l'email si fourni
      if (req.body.email) {
        req.body.email = req.body.email.trim().toLowerCase();
        
        // Vérifier si le nouvel email est déjà utilisé par un autre compte
        const existingUser = await accountDataMapper.findByEmail(req.body.email);
        if (existingUser && existingUser.id !== accountId) {
          throw new ApiError(409, 'Cet email est déjà utilisé par un autre compte');
        }
      }
      
      // Empêcher un utilisateur non-admin de modifier son propre rôle
      if (req.user.role !== 'admin' && req.body.role) {
        delete req.body.role;
      }
      
      // Fusion des préférences existantes avec les nouvelles
      if (req.body.preferences) {
        const currentAccount = await accountDataMapper.findOneAccount(accountId);
        if (currentAccount) {
          req.body.preferences = { 
            ...currentAccount.preferences, 
            ...req.body.preferences 
          };
        }
      }
      
      const updatedAccount = await accountDataMapper.updateAccount(accountId, req.body);

      if (!updatedAccount) {
        throw new ApiError(404, 'Compte non trouvé');
      }

      return res.status(200).json({
        status: 'success',
        data: formatUserResponse(updatedAccount)  
      });
    } catch (err) {
      throw err;
    }
  },

  deleteAccount: async (req, res) => {
    try {
      const accountId = parseInt(req.params.id, 10);
      
      // Vérifier si l'utilisateur supprime son propre compte ou s'il est admin
      if (req.user.id !== accountId && req.user.role !== 'admin') {
        throw new ApiError(403, 'Vous n\'êtes pas autorisé à supprimer ce compte');
      }
      
      const deleted = await accountDataMapper.deleteAccount(accountId);

      if (!deleted) {
        throw new ApiError(404, 'Compte non trouvé');
      }

      return res.status(204).end();
    } catch (err) {
      throw err;
    }
  },

  loginForm: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validation basique des champs requis
      if (!email || !password) {
        throw new ApiError(400, 'Email et mot de passe requis');
      }
      
      // Normalisation de l'email
      const normalizedEmail = email.trim().toLowerCase();

      // Vérifier si l'utilisateur existe
      const user = await accountDataMapper.findByEmailWithPassword(normalizedEmail);
      if (!user) {
        throw new ApiError(401, 'Email ou mot de passe incorrect');
      }

      // Vérifier le mot de passe
      const isPasswordValid = await cryptoPassword.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new ApiError(401, 'Email ou mot de passe incorrect');
      }

      // Vérifier si l'abonnement est toujours valide
      if (user.subscription_status === 'cancelled') {
        throw new ApiError(403, 'Votre abonnement a été annulé');
      }

      // Générer un token JWT
      const token = generateToken(user);

      // Stocker le token dans un cookie sécurisé
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7200000, // 2 heures en millisecondes
        sameSite: 'strict'
      });

      return res.status(200).json({
        status: 'success',
        data: {
          user: formatUserResponse(user),
          token
        }
      });
    } catch (err) {
      throw err;
    }
  },

  logout: async (req, res) => {
    try {
      // Supprimer le cookie d'authentification
      res.clearCookie('auth_token');
      
      return res.status(200).json({
        status: 'success',
        message: 'Déconnexion réussie'
      });
    } catch (err) {
      throw err;
    }
  },

  // Méthode pour vérifier le token actuel (utile pour la persistance de session côté client)
  verifyToken: async (req, res) => {
    try {
      // Récupérer le token du header Authorization ou du cookie
      const authHeader = req.headers.authorization;
      const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
      const tokenFromCookie = req.cookies ? req.cookies.auth_token : null;
      
      const token = tokenFromHeader || tokenFromCookie;
      
      if (!token) {
        throw new ApiError(401, 'Non authentifié');
      }
      
      try {
        // Vérifier le token avec la clé publique
        const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
        
        // Récupérer les informations utilisateur à jour
        const user = await accountDataMapper.findOneAccount(decoded.userId);
        
        if (!user) {
          throw new ApiError(401, 'Utilisateur non trouvé');
        }
        
        return res.status(200).json({
          status: 'success',
          data: {
            user: formatUserResponse(user)
          }
        });
      } catch (jwtError) {
        if (jwtError.name === 'JsonWebTokenError') {
          throw new ApiError(401, 'Token invalide');
        }
        if (jwtError.name === 'TokenExpiredError') {
          throw new ApiError(401, 'Token expiré');
        }
        throw new ApiError(401, jwtError.message || 'Une erreur est survenue lors de la vérification du token');
      }
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Une erreur est survenue lors de la vérification du token'
      });
    }
  }
};

export default accountController;