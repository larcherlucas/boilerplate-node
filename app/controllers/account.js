import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import accountDataMapper from '../datamappers/account.js';
import ApiError from '../erros/api.error.js';
import generateToken from '../utils/generateToken.js';

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
      const { email, password, household_members, preferences } = req.body;

      // Vérifier si l'email existe déjà
      const existingUser = await accountDataMapper.findByEmail(email);
      if (existingUser) {
        throw new ApiError(409, 'Cet email est déjà utilisé');
      }

      // Hasher le mot de passe
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Préparer les données utilisateur
      const userData = {
        email,
        password_hash,
        role: 'user',
        household_members: household_members || {
          adults: 0,
          children_over_3: 0,
          children_under_3: 0,
          babies: 0
        },
        preferences: preferences || {}
      };

      // Créer le nouvel utilisateur
      const newAccount = await accountDataMapper.createAccount(userData);

      // Générer un token JWT
      const token = generateToken(newAccount);

      return res.status(201).json({
        status: 'success',
        data: {
          user: {
            id: newAccount.id,
            email: newAccount.email,
            role: newAccount.role
          },
          token
        }
      });
    } catch (err) {
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
        const saltRounds = 10;
        req.body.password_hash = await bcrypt.hash(req.body.password, saltRounds);
        delete req.body.password;
      }
      
      // Empêcher un utilisateur non-admin de modifier son propre rôle
      if (req.user.role !== 'admin' && req.body.role) {
        delete req.body.role;
      }
      
      const updatedAccount = await accountDataMapper.updateAccount(accountId, req.body);

      if (!updatedAccount) {
        throw new ApiError(404, 'Compte non trouvé');
      }

      return res.status(200).json({
        status: 'success',
        data: updatedAccount
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

      // Vérifier si l'utilisateur existe
      const user = await accountDataMapper.findByEmailWithPassword(email);
      if (!user) {
        throw new ApiError(401, 'Email ou mot de passe incorrect');
      }

      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
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
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            subscription_status: user.subscription_status
          },
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
      // Récupérer le token du cookie ou du header Authorization
      const token = req.cookies.auth_token || 
                    (req.headers.authorization && req.headers.authorization.split(' ')[1]);
      
      if (!token) {
        throw new ApiError(401, 'Non authentifié');
      }
      
      // Vérifier le token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Récupérer les informations utilisateur à jour
        const user = await accountDataMapper.findOneAccount(decoded.userId);
        
        if (!user) {
          throw new ApiError(401, 'Utilisateur non trouvé');
        }
        
        return res.status(200).json({
          status: 'success',
          data: {
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              subscription_status: user.subscription_status
            }
          }
        });
      } catch (error) {
        throw new ApiError(401, 'Token invalide ou expiré');
      }
    } catch (err) {
      throw err;
    }
  }
};

export default accountController;