// app/middlewares/admin.middleware.js
import checkRole from './role.middleware.js';

// Un simple middleware qui vérifie si l'utilisateur a le rôle 'admin'
const adminMiddleware = checkRole('admin');

export default adminMiddleware;