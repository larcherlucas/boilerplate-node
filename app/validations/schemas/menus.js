import Joi from 'joi';

export const weeklyMenuSchema = Joi.object({
  type: Joi.string().valid('weekly', 'monthly').required(),
  meal_schedule: Joi.object().required(),
  status: Joi.string().valid('active', 'archived', 'draft').default('active'),
  is_customized: Joi.boolean().default(false),
  family_size: Joi.number().integer().min(1).default(1),
  valid_from: Joi.date().iso().required(),
  valid_to: Joi.date().iso().greater(Joi.ref('valid_from')).required(),
  user_preferences: Joi.object().optional()
}).required();