import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ApiError from '../erros/api.error.js';
import accountDataMapper from '../datamappers/account.js';
import { config } from 'dotenv';

// Charger les variables d'environnement
config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Résolution du chemin absolu pour la clé publique en utilisant les variables d'environnement
const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH.startsWith('./app') 
  ? path.join(__dirname, '..', process.env.JWT_PUBLIC_KEY_PATH.substring(5)) 
  : process.env.JWT_PUBLIC_KEY_PATH;

let publicKey;
try {
  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  console.log("Clé publique chargée avec succès");
} catch (error) {
  console.error('Erreur lors du chargement de la clé publique:', error);
  console.error('Chemin tenté:', publicKeyPath);
  // Tentative de chemin alternatif si le premier échoue
  try {
    const alternativePath = path.join(__dirname, '..', 'keys', 'public.key');
    publicKey = fs.readFileSync(alternativePath, 'utf8');
    console.log("Clé publique chargée depuis le chemin alternatif:", alternativePath);
  } catch (altError) {
    console.error('Échec du chargement depuis le chemin alternatif:', altError);
    throw new Error('Impossible de charger la clé publique JWT');
  }
}

const authMiddleware = async (req, res, next) => {
  try {
    // Vérifier la présence du token dans les headers
    const authHeader = req.headers.authorization;
    console.log("Auth Header:", authHeader); // Debug: vérification du header
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Aucun token fourni' });
    }

    // Extraire le token
    const token = authHeader.split(' ')[1];
    console.log("Token extrait:", token.substring(0, 20) + "..."); // Debug: vérification du token
    
    try {
      // Vérifier et décoder le token avec la clé publique
      const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      console.log("Token décodé:", decoded); // Debug: vérification du décodage
      
      // Récupérer les informations de l'utilisateur à partir du datamapper
      const user = await accountDataMapper.findUserForAuth(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ message: "Utilisateur non trouvé" });
      }
      
      console.log("Utilisateur trouvé:", user); // Debug: vérification de l'utilisateur
      
      // Vérifier le statut de l'abonnement
      if (user.subscription_status === 'cancelled') {
        return res.status(401).json({ message: "Compte désactivé ou abonnement annulé" });
      }

      // Vérifier si l'abonnement est expiré
      if (user.subscription_end_date && new Date(user.subscription_end_date) < new Date()) {
        // Mettre à jour le statut si nécessaire
        await accountDataMapper.updateAccount(user.id, { subscription_status: 'expired' });
        return res.status(401).json({ message: "Abonnement expiré" });
      }

      // Ajouter les informations de l'utilisateur à l'objet request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        subscription_status: user.subscription_status,
        subscription_type: user.subscription_type
      };

      next();
    } catch (err) {
      console.error("Erreur lors de la vérification du token:", err); // Debug: afficher l'erreur
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token invalide' });
      }
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expiré' });
      }
      return res.status(500).json({ message: 'Erreur de serveur' });
    }
  } catch (error) {
    console.error('Erreur dans authMiddleware:', error);
    return res.status(500).json({ message: 'Erreur de serveur' });
  }
};

// Middleware pour vérifier les rôles spécifiques
export const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'Permissions insuffisantes');
    }
    next();
  };
};

export default authMiddleware;