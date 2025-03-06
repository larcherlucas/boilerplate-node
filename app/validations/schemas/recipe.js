  import Joi from 'joi';

  // Constantes pour les enums de la base de données
  const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];
  const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
  const SEASONS = ['spring', 'summer', 'autumn', 'winter', 'all'];

  // Schéma pour les ingrédients
  const ingredientSchema = Joi.object({
    name: Joi.string().required(),
    quantity: Joi.number().positive().required(),
    unit: Joi.string().required(),
    optional: Joi.boolean().default(false)
  });

  // Schéma pour les étapes de préparation
  const stepSchema = Joi.object({
    order: Joi.number().integer().positive().required(),
    description: Joi.string().required(),
    duration: Joi.number().integer().positive()
  });

  // Schéma pour les informations nutritionnelles
  const nutritionSchema = Joi.object({
    calories: Joi.number().positive(),
    proteins: Joi.number().positive(),
    carbohydrates: Joi.number().positive(),
    fats: Joi.number().positive(),
    fiber: Joi.number().positive(),
    sodium: Joi.number().positive()
  });

  // Schéma principal pour la recette
  export const recipeSchema = Joi.object({
    title: Joi.string()
      .min(3)
      .max(255)
      .required()
      .messages({
        'string.min': 'Le titre doit contenir au moins 3 caractères',
        'string.max': 'Le titre ne peut pas dépasser 255 caractères',
        'any.required': 'Le titre est obligatoire'
      }),

    description: Joi.string()
      .min(10)
      .max(1000)
      .required()
      .messages({
        'string.min': 'La description doit contenir au moins 10 caractères',
        'string.max': 'La description ne peut pas dépasser 1000 caractères',
        'any.required': 'La description est obligatoire'
      }),

    origin: Joi.string()
      .max(50)
      .optional(),

    prep_time: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'Le temps de préparation doit être un nombre',
        'number.positive': 'Le temps de préparation doit être positif',
        'any.required': 'Le temps de préparation est obligatoire'
      }),

    difficulty_level: Joi.string()
      .valid(...DIFFICULTY_LEVELS)
      .required()
      .messages({
        'any.only': 'Le niveau de difficulté doit être easy, medium ou hard',
        'any.required': 'Le niveau de difficulté est obligatoire'
      }),

    meal_type: Joi.string()
      .valid(...MEAL_TYPES)
      .required()
      .messages({
        'any.only': 'Le type de repas doit être breakfast, lunch, dinner, snack ou dessert',
        'any.required': 'Le type de repas est obligatoire'
      }),

    season: Joi.string()
      .valid(...SEASONS)
      .default('all')
      .messages({
        'any.only': 'La saison doit être spring, summer, autumn, winter ou all'
      }),

    is_premium: Joi.boolean()
      .default(false),

    ingredients: Joi.array()
      .items(ingredientSchema)
      .min(1)
      .required()
      .messages({
        'array.min': 'Au moins un ingrédient est requis',
        'any.required': 'Les ingrédients sont obligatoires'
      }),

    steps: Joi.array()
      .items(stepSchema)
      .min(1)
      .required()
      .messages({
        'array.min': 'Au moins une étape est requise',
        'any.required': 'Les étapes sont obligatoires'
      }),

    nutrition_info: nutritionSchema
      .default({}),

    servings: Joi.number()
      .integer()
      .positive()
      .default(4)
      .messages({
        'number.base': 'Le nombre de portions doit être un nombre',
        'number.positive': 'Le nombre de portions doit être positif'
      }),

    image_url: Joi.string()
      .uri()
      .optional()
      .messages({
        'string.uri': 'L\'URL de l\'image n\'est pas valide'
      })
  }).options({ stripUnknown: true });