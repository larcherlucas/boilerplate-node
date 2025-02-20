import Joi from 'joi';

export const favoriteSchema = Joi.object({
  recipe_id: Joi.number().integer().positive().required()
}).required();