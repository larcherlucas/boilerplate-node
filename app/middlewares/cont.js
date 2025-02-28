// devBypassAuth.js
const bypassAuthMiddleware = (req, res, next) => {
    // Définir un utilisateur fictif avec des droits d'administrateur pour le développement
    req.user = {
      id: 1,
      email: 'dev@example.com',
      role: 'admin',
      subscription_status: 'active'
    };
    
    console.log("AUTH BYPASS: Authentification contournée pour", req.originalUrl);
    next();
  };
  
  export default bypassAuthMiddleware;