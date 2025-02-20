import Joi from 'joi';

export const seasonalItemSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  type: Joi.string().valid('vegetable', 'fruit').required(),
  seasons: Joi.object().required(),
  description: Joi.string().allow(null, ''),
  image_url: Joi.string().uri().allow(null, ''),
  nutritional_benefits: Joi.string().allow(null, ''),
  storage_tips: Joi.string().allow(null, '')
}).required();