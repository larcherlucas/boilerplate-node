import favoritesDataMapper from '../datamappers/favorites.js';

const favoritesController = {
  // Récupérer tous les favoris d'un utilisateur
  async getAll(req, res) {
    try {
      const userId = req.user.id;
      
      // Vérifier si l'utilisateur a un abonnement actif
      const hasActiveSubscription = 
        req.user.subscription_status === 'active' || 
        (req.subscription && req.subscription.active) ||
        req.user.role === 'admin' ||
        req.user.role === 'premium';
      
      // Récupérer les favoris
      const favorites = await favoritesDataMapper.findAllByUser(userId, hasActiveSubscription);
      
      res.json({
        status: 'success',
        data: favorites,
        subscription: {
          active: hasActiveSubscription,
          type: req.user.subscription_type || 'none'
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des favoris:', error);
      res.status(500).json({
        status: 'error',
        message: 'Erreur lors de la récupération des favoris'
      });
    }
  },
  
  // Ajouter un favori
  async create(req, res) {
    try {
      const userId = req.user.id;
      const { recipe_id } = req.body;
      
      if (!recipe_id) {
        return res.status(400).json({
          status: 'error',
          message: 'L\'ID de la recette est requis'
        });
      }
      
      // Vérifier si la recette existe
      const recipe = await favoritesDataMapper.checkRecipeExists(recipe_id);
      
      if (!recipe) {
        return res.status(404).json({
          status: 'error',
          message: 'Recette non trouvée'
        });
      }
      
      // Vérifier si la recette est premium et si l'utilisateur y a accès
      if (recipe.is_premium) {
        const hasAccess = 
          req.user.subscription_status === 'active' || 
          (req.subscription && req.subscription.active) ||
          req.user.role === 'admin' ||
          req.user.role === 'premium';
        
        if (!hasAccess) {
          return res.status(403).json({
            status: 'error',
            message: 'Cette recette requiert un abonnement premium'
          });
        }
      }
      
      // Créer le favori
      const favorite = await favoritesDataMapper.create(userId, recipe_id);
      
      res.status(201).json({
        status: 'success',
        data: favorite,
        message: 'Recette ajoutée aux favoris'
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du favori:', error);
      res.status(500).json({
        status: 'error',
        message: 'Erreur lors de l\'ajout du favori'
      });
    }
  },
  
  // Supprimer un favori
  async delete(req, res) {
    try {
      const userId = req.user.id;
      const recipeId = req.params.recipeId;
      
      const favorite = await favoritesDataMapper.delete(userId, recipeId);
      
      if (!favorite) {
        return res.status(404).json({
          status: 'error',
          message: 'Favori non trouvé'
        });
      }
      
      res.json({
        status: 'success',
        message: 'Recette retirée des favoris'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du favori:', error);
      res.status(500).json({
        status: 'error',
        message: 'Erreur lors de la suppression du favori'
      });
    }
  },
  
  // Vérifier si une recette est dans les favoris
  async checkFavorite(req, res) {
    try {
      const userId = req.user.id;
      const recipeId = req.params.recipeId;
      
      const favorite = await favoritesDataMapper.findOne(userId, recipeId);
      
      res.json({
        status: 'success',
        isFavorite: !!favorite
      });
    } catch (error) {
      console.error('Erreur lors de la vérification du favori:', error);
      res.status(500).json({
        status: 'error',
        message: 'Erreur lors de la vérification du favori'
      });
    }
  }
};

export default favoritesController;