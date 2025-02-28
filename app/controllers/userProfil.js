import accountDataMapper from '../datamappers/account.js';
import ApiError from '../erros/api.error.js';

const userProfileController = {
  // Profil utilisateur
  getProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      
      const profile = await accountDataMapper.findOneAccount(userId);
      
      if (!profile) {
        throw new ApiError(404, 'Profil non trouvé');
      }
      
      // Structurer la réponse avec les informations d'abonnement
      const response = {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        role: profile.role,
        household_members: profile.household_members,
        preferences: profile.preferences,
        subscription: {
          type: profile.subscription_type || null,
          isActive: profile.subscription_status === 'active',
          status: profile.subscription_status || null,
          startDate: profile.subscription_start_date || null,
          endDate: profile.subscription_end_date || null
        },
        created_at: profile.created_at,
        updated_at: profile.updated_at
      };
      
      return res.status(200).json({
        status: 'success',
        data: response
      });
    } catch (err) {
      throw err;
    }
  },
  
  updateProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Si le mot de passe est fourni, préparer son hash
      if (req.body.password) {
        req.body.password_hash = await accountDataMapper.cryptoPassword.hash(req.body.password);
        delete req.body.password;
      }
      
      // Interdire la modification du rôle par l'utilisateur lui-même
      delete req.body.role;
      
      const updatedProfile = await accountDataMapper.updateAccount(userId, req.body);
      
      if (!updatedProfile) {
        throw new ApiError(404, 'Profil non trouvé');
      }
      
      return res.status(200).json({
        status: 'success',
        data: updatedProfile
      });
    } catch (err) {
      throw err;
    }
  },
  
  deleteProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      
      const deleted = await accountDataMapper.deleteAccount(userId);
      
      if (!deleted) {
        throw new ApiError(404, 'Profil non trouvé');
      }
      
      // Supprimer le cookie d'authentification
      res.clearCookie('auth_token');
      
      return res.status(204).end();
    } catch (err) {
      throw err;
    }
  },
  
  // Restrictions alimentaires
  getDietaryRestrictions: async (req, res) => {
    try {
      const userId = req.user.id;
      
      const restrictions = await accountDataMapper.getDietaryRestrictions(userId);
      
      return res.status(200).json({
        status: 'success',
        data: restrictions
      });
    } catch (err) {
      throw err;
    }
  },
  
  addDietaryRestriction: async (req, res) => {
    try {
      const userId = req.user.id;
      const { restriction_type, details } = req.body;
      
      if (!restriction_type) {
        throw new ApiError(400, 'Le type de restriction est requis');
      }
      
      const newRestriction = await accountDataMapper.addDietaryRestriction(userId, { 
        restriction_type, 
        details 
      });
      
      return res.status(201).json({
        status: 'success',
        data: newRestriction
      });
    } catch (err) {
      throw err;
    }
  },
  
  deleteDietaryRestriction: async (req, res) => {
    try {
      const userId = req.user.id;
      const restrictionType = req.params.type;
      
      const deleted = await accountDataMapper.deleteDietaryRestriction(userId, restrictionType);
      
      if (!deleted) {
        throw new ApiError(404, 'Restriction non trouvée');
      }
      
      return res.status(204).end();
    } catch (err) {
      throw err;
    }
  },
  
  deleteAllDietaryRestrictions: async (req, res) => {
    try {
      const userId = req.user.id;
      
      await accountDataMapper.deleteAllDietaryRestrictions(userId);
      
      return res.status(204).end();
    } catch (err) {
      throw err;
    }
  },
  
  // Gestion du foyer
  getComposition: async (req, res) => {
    try {
      const userId = req.user.id;
      
      const household = await accountDataMapper.getHouseholdMembers(userId);
      
      return res.status(200).json({
        status: 'success',
        data: household
      });
    } catch (err) {
      throw err;
    }
  },
  
  addMember: async (req, res) => {
    try {
      const userId = req.user.id;
      const { type, count = 1 } = req.body;
      
      if (!type || !['adults', 'children_over_3', 'children_under_3', 'babies'].includes(type)) {
        throw new ApiError(400, 'Type de membre invalide');
      }
      
      // Récupérer la composition actuelle du foyer
      const currentHousehold = await accountDataMapper.getHouseholdMembers(userId);
      
      // Mettre à jour le nombre de membres du type spécifié
      currentHousehold[type] = (currentHousehold[type] || 0) + count;
      
      // Enregistrer les modifications
      const updatedHousehold = await accountDataMapper.updateHouseholdMembers(userId, currentHousehold);
      
      return res.status(200).json({
        status: 'success',
        data: updatedHousehold
      });
    } catch (err) {
      throw err;
    }
  },
  
  deleteMember: async (req, res) => {
    try {
      const userId = req.user.id;
      const type = req.params.id; // Utilise 'id' comme identifiant du type de membre
      
      if (!type || !['adults', 'children_over_3', 'children_under_3', 'babies'].includes(type)) {
        throw new ApiError(400, 'Type de membre invalide');
      }
      
      // Récupérer la composition actuelle du foyer
      const currentHousehold = await accountDataMapper.getHouseholdMembers(userId);
      
      // Réduire le nombre de membres du type spécifié
      if (currentHousehold[type] > 0) {
        currentHousehold[type] -= 1;
      }
      
      // Enregistrer les modifications
      const updatedHousehold = await accountDataMapper.updateHouseholdMembers(userId, currentHousehold);
      
      return res.status(200).json({
        status: 'success',
        data: updatedHousehold
      });
    } catch (err) {
      throw err;
    }
  },
  
  deleteAllMembers: async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Réinitialiser la composition du foyer
      const emptyHousehold = {
        adults: 0,
        children_over_3: 0,
        children_under_3: 0,
        babies: 0
      };
      
      await accountDataMapper.updateHouseholdMembers(userId, emptyHousehold);
      
      return res.status(204).end();
    } catch (err) {
      throw err;
    }
  }
};

export default userProfileController;