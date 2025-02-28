/**
 * Formate les données utilisateur pour une réponse API cohérente
 * @param {Object} user - Les données de l'utilisateur depuis la base de données
 * @param {Boolean} includeFullProfile - Inclure le profil complet (true) ou seulement les infos de base (false)
 * @returns {Object} - Données utilisateur formatées
 */
const formatUserResponse = (user, includeFullProfile = false) => {
    if (!user) return null;
  
    // Données de base toujours incluses
    const response = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      household_members: user.household_members || {
        adults: 0,
        children_over_3: 0,
        children_under_3: 0,
        babies: 0
      },
      preferences: user.preferences || {},
      subscription: {
        type: user.subscription_type || null,
        isActive: user.subscription_status === 'active',
        status: user.subscription_status || null,
        startDate: user.subscription_start_date || null,
        endDate: user.subscription_end_date || null
      },
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  
    // Ajouter les dates d'abonnement si disponibles
    if (user.subscription_start_date) {
      response.subscription.startDate = user.subscription_start_date;
    }
  
    if (user.subscription_end_date) {
      response.subscription.endDate = user.subscription_end_date;
    }
  
    // Ajouter les données de profil complètes si demandées
    if (includeFullProfile) {
      response.household_members = user.household_members || {};
      response.preferences = user.preferences || {};
      response.created_at = user.created_at;
      response.updated_at = user.updated_at;
    }
  
    return response;
  };
  
  export default formatUserResponse;
  