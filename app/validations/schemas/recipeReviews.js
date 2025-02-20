import Joi from 'joi';

export const recipeReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().allow(null, '')
}).required();
