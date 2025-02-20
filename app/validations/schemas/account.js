/* eslint-disable max-len */
import Joi from 'joi';

// Validators de base
const emailValidator = Joi.string()
  .email()
  .pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.(fr|com|net)$/)
  .required();

const passwordValidator = Joi.string()
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W)(?!.*\s).{8,}$/)
  .required();

const roleValidator = Joi.string().valid('admin', 'user', 'premium').default('user');

const subscriptionStatusValidator = Joi.string().valid('active', 'cancelled', 'expired', 'pending');

const jsonbValidator = Joi.object().default({});

// Schéma pour POST (création d'un compte)
export const postSchema = Joi.object({
  email: emailValidator,
  password: passwordValidator,
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  role: roleValidator,
  household_members: jsonbValidator,
  preferences: jsonbValidator,
  billing_info: jsonbValidator,
  subscription_type: Joi.string().optional(),
  subscription_start_date: Joi.date().optional(),
  subscription_end_date: Joi.date().optional(),
  subscription_status: subscriptionStatusValidator.optional(),
}).with('password', 'confirmPassword');

// Schéma pour PATCH (mise à jour d'un compte)
export const patchSchema = Joi.object({
  email: emailValidator.optional(),
  password: passwordValidator.optional(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).optional(),
  role: roleValidator.optional(),
  household_members: jsonbValidator.optional(),
  preferences: jsonbValidator.optional(),
  billing_info: jsonbValidator.optional(),
  subscription_type: Joi.string().optional(),
  subscription_start_date: Joi.date().optional(),
  subscription_end_date: Joi.date().optional(),
  subscription_status: subscriptionStatusValidator.optional(),
}).with('password', 'confirmPassword');

// Schéma pour login
export const loginSchema = Joi.object({
  email: emailValidator,
  password: passwordValidator
});

// Schéma pour validation d'un token
export const tokenSchema = Joi.object({
  token: Joi.string().required()
});

// Schéma pour les restrictions alimentaires
export const dietaryRestrictionSchema = Joi.object({
  restriction_type: Joi.string().required(),
  details: Joi.string().optional()
});

// Schéma pour les favoris
export const favoriteSchema = Joi.object({
  recipe_id: Joi.number().integer().positive().required()
});

// Schéma pour les évaluations de recettes
export const reviewSchema = Joi.object({
  recipe_id: Joi.number().integer().positive().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().optional()
});

// Schéma pour les préférences utilisateur
export const preferencesSchema = Joi.object({
  dietary_preferences: Joi.array().items(Joi.string()).optional(),
  allergies: Joi.array().items(Joi.string()).optional(),
  disliked_ingredients: Joi.array().items(Joi.string()).optional(),
  cooking_time_preference: Joi.string().valid('quick', 'medium', 'any').optional(),
  meal_size_preference: Joi.string().valid('small', 'medium', 'large').optional(),
  cuisine_preferences: Joi.array().items(Joi.string()).optional()
}).min(1);

// Schéma pour les informations de facturation
export const billingInfoSchema = Joi.object({
  address_line1: Joi.string().required(),
  address_line2: Joi.string().optional(),
  city: Joi.string().required(),
  postal_code: Joi.string().pattern(/^\d{5}$/).required(),
  country: Joi.string().required(),
  payment_method: Joi.string().valid('credit_card', 'paypal').required(),
  card_details: Joi.object({
    last4: Joi.string().pattern(/^\d{4}$/).optional(),
    brand: Joi.string().optional(),
    exp_month: Joi.number().integer().min(1).max(12).optional(),
    exp_year: Joi.number().integer().min(new Date().getFullYear()).optional()
  }).optional()
});

// Schéma pour la mise à jour du mot de passe
export const passwordUpdateSchema = Joi.object({
  current_password: passwordValidator,
  new_password: passwordValidator,
  confirm_new_password: Joi.string().valid(Joi.ref('new_password')).required()
});

// Middleware de validation
const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    const { error, value } = schema.validate(req[source], { abortEarly: false });
    
    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errorMessages
      });
    }
    
    // Mise à jour des données validées
    req[source] = value;
    return next();
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Internal validation error',
      error: err.message
    });
  }
};

export default validate;