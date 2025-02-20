import Joi from 'joi';

export const dietaryRestrictionSchema = Joi.object({
  restriction_type: Joi.string().min(2).max(50).required(),
  details: Joi.string().allow(null, '')
}).required();