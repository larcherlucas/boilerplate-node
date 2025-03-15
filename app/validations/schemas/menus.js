import Joi from 'joi';

export const weeklyMenuSchema = Joi.object({
  type: Joi.string().valid('weekly', 'monthly').required(),
  meal_schedule: Joi.object().optional(),
  status: Joi.string().valid('active', 'archived', 'draft').default('active'),
  is_customized: Joi.boolean().default(false),
  family_size: Joi.number().integer().min(1).default(1),
  household_members: Joi.object({
    adults: Joi.number().integer().min(0).default(1),
    children_over_3: Joi.number().integer().min(0).default(0),
    children_under_3: Joi.number().integer().min(0).default(0),
    babies: Joi.number().integer().min(0).default(0)
  }).optional(),
  valid_from: Joi.date().iso().required(),
  valid_to: Joi.date().iso().greater(Joi.ref('valid_from')).required(),
  user_preferences: Joi.object({
    mealTypes: Joi.array().items(
      Joi.string().valid('breakfast', 'lunch', 'dinner', 'snack', 'dessert')
    ).min(1).default(['breakfast', 'lunch', 'dinner']),
    dietaryRestrictions: Joi.array().items(
      Joi.string().valid('vegetarian', 'vegan', 'gluten-free', 'lactose-free', 'nut-free')
    ).optional(),
    excludedIngredients: Joi.array().items(Joi.string()).optional(),
    age_category: Joi.array().items(
      Joi.string().valid('toute la famille', 'bébé 6 à 9 mois', 'bébé 9 à 12 mois', 'bébé 12 à 18 mois', 'bébé 18 mois et +', 'enfant')
    ).optional()
  }).optional()
}).required();