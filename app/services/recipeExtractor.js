import axios from 'axios';
import * as cheerio from 'cheerio';
import { recipeSchema } from '../validations/schemas/recipe.js';

/**
 * Extracteur principal de recettes
 * Accepte une URL ou un texte brut et retourne une recette structurée
 */
class RecipeExtractor {
  /**
   * Extrait une recette à partir d'une URL ou d'un texte
   * @param {Object} options - Options d'extraction
   * @param {string} options.url - URL du site de recette (optionnel)
   * @param {string} options.text - Texte brut de la recette (optionnel)
   * @returns {Promise<Object>} Recette structurée prête pour la base de données
   */
  static async extract({ url, text }) {
    try {
      let recipeData;
      
      // Extraction depuis une URL ou utilisation du texte fourni
      if (url) {
        recipeData = await this.scrapeFromUrl(url);
      } else if (text) {
        recipeData = this.parseTextRecipe(text);
      } else {
        throw new Error('Vous devez fournir une URL ou un texte de recette');
      }
      
      // Adaptation au format de la base de données
      const dbReadyRecipe = this.adaptToDatabaseSchema(recipeData);
      
      // Validation avec le schéma Joi
      await this.validateRecipe(dbReadyRecipe);
      
      return dbReadyRecipe;
    } catch (error) {
      console.error('Erreur lors de l\'extraction de la recette:', error);
      throw error;
    }
  }
  
  /**
   * Extrait le contenu d'une page de recette
   * @param {string} url - URL du site de recette
   * @returns {Promise<Object>} Structure de la recette extraite
   */
  static async scrapeFromUrl(url) {
    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      
      // Extraction plus robuste basée sur des sélecteurs courants
      const title = $('h1').first().text().trim();
      
      // Trouver la description (recherche dans plusieurs structures courantes)
      let description = $('.recipe-summary, .recipe-description, [itemprop="description"]').first().text().trim();
      if (!description) {
        // Essayer d'autres sélecteurs si nécessaire
        description = $('.entry-content p, .post-content p').first().text().trim();
      }
      
      // Extraire les temps de préparation et cuisson
      let prepTime = 0;
      let cookTime = 0;
      
      // Recherche structurée (schema.org)
      const prepTimeStr = $('[itemprop="prepTime"]').attr('content') || 
                         $('[itemprop="prepTime"]').text().trim();
      const cookTimeStr = $('[itemprop="cookTime"]').attr('content') || 
                         $('[itemprop="cookTime"]').text().trim();
      
      // Analyse des temps (formats PT15M, 15 min, etc.)
      prepTime = this.parseTimeString(prepTimeStr);
      cookTime = this.parseTimeString(cookTimeStr);
      
      // Si aucun temps trouvé, chercher dans du texte
      if (prepTime === 0) {
        const prepRegex = /préparation[:\s]+(\d+)[\s]*(min|minute|h|heure)/i;
        const prepMatch = $('.prep-time, .recipe-meta').text().match(prepRegex);
        if (prepMatch) prepTime = parseInt(prepMatch[1], 10);
      }
      
      if (cookTime === 0) {
        const cookRegex = /cuisson[:\s]+(\d+)[\s]*(min|minute|h|heure)/i;
        const cookMatch = $('.cook-time, .recipe-meta').text().match(cookRegex);
        if (cookMatch) cookTime = parseInt(cookMatch[1], 10);
      }
      
      // Extraire les ingrédients
      const ingredients = [];
      $('.ingredients li, .ingredient-list li, [itemprop="recipeIngredient"]').each((i, el) => {
        const ingredientText = $(el).text().trim();
        const parsedIngredient = this.parseIngredient(ingredientText);
        if (parsedIngredient) {
          ingredients.push(parsedIngredient);
        }
      });
      
      // Extraire les étapes
      const steps = [];
      $('.instructions li, .recipe-directions li, [itemprop="recipeInstructions"] li, .step').each((i, el) => {
        const stepText = $(el).text().trim();
        if (stepText) {
          steps.push({
            order: i + 1,
            description: stepText,
            duration: 5 // Durée par défaut
          });
        }
      });
      
      // Si pas de steps trouvées avec des li, essayer les paragraphes
      if (steps.length === 0) {
        $('.instructions p, .recipe-directions p, [itemprop="recipeInstructions"] p').each((i, el) => {
          const stepText = $(el).text().trim();
          if (stepText && stepText.length > 10) { // Éviter les paragraphes vides ou trop courts
            steps.push({
              order: i + 1,
              description: stepText,
              duration: 5
            });
          }
        });
      }
      
      // Essayer de déterminer le type de plat, la difficulté et la saison
      const mealType = this.determineMealType(title, description);
      const difficultyLevel = this.determineDifficulty(prepTime, cookTime);
      const season = this.determineSeason(ingredients);
      
      // Nombre de portions
      let servings = 4; // Valeur par défaut
      const servingsText = $('[itemprop="recipeYield"]').text().trim();
      const servingsMatch = servingsText.match(/(\d+)/);
      if (servingsMatch) {
        servings = parseInt(servingsMatch[1], 10);
      }
      
      return {
        title,
        description,
        prep_time: prepTime || 15, // Valeur par défaut si non trouvé
        cook_time: cookTime || 0,
        difficulty_level: difficultyLevel,
        meal_type: mealType,
        season,
        is_premium: false, // Par défaut
        servings,
        ingredients,
        steps,
        origin: '',
        nutrition_info: {}
      };
    } catch (error) {
      console.error('Erreur lors de l\'extraction depuis l\'URL:', error);
      throw new Error(`Impossible d'extraire la recette depuis l'URL: ${error.message}`);
    }
  }
  
  /**
   * Analyse une chaîne de temps et retourne la durée en minutes
   * @param {string} timeStr - Chaîne de caractères contenant un temps
   * @returns {number} Temps en minutes
   */
  static parseTimeString(timeStr) {
    if (!timeStr) return 0;
    
    // Format ISO 8601 Duration (PT15M)
    const isoMatch = timeStr.match(/PT(\d+)([HMS])/);
    if (isoMatch) {
      const value = parseInt(isoMatch[1], 10);
      const unit = isoMatch[2];
      
      switch (unit) {
        case 'H': return value * 60; // Heures en minutes
        case 'M': return value;      // Minutes
        case 'S': return Math.ceil(value / 60); // Secondes en minutes
        default: return 0;
      }
    }
    
    // Format texte (15 min, 1h30, etc.)
    const numericMatch = timeStr.match(/(\d+)\s*(min|h|heure)/i);
    if (numericMatch) {
      const value = parseInt(numericMatch[1], 10);
      const unit = numericMatch[2].toLowerCase();
      
      if (unit === 'h' || unit === 'heure') {
        return value * 60;
      }
      return value;
    }
    
    // Tenter d'extraire juste un nombre
    const numMatch = timeStr.match(/(\d+)/);
    if (numMatch) {
      return parseInt(numMatch[1], 10);
    }
    
    return 0;
  }
  
  /**
   * Analyse une chaîne d'ingrédient et extrait la quantité, l'unité et le nom
   * @param {string} ingredientText - Texte de l'ingrédient
   * @returns {Object|null} Ingrédient structuré ou null si impossible à parser
   */
  static parseIngredient(ingredientText) {
    // Expressions régulières pour extraire quantité, unité et nom
    const fullRegex = /^(?:(\d+(?:[,.]\d+)?)\s*)?(?:([a-zéèêëàâäôöùûüç]+\.?)\s+)?(?:de\s+)?(.+)$/i;
    const match = ingredientText.match(fullRegex);
    
    if (!match) return null;
    
    let [, quantity, unit, name] = match;
    
    // Nettoyage
    quantity = quantity ? parseFloat(quantity.replace(',', '.')) : 1;
    
    // Normalisation des unités
    if (unit) {
      unit = unit.toLowerCase();
      // Mapping des abréviations courantes
      const unitMap = {
        'g': 'g',
        'gr': 'g',
        'kg': 'kg',
        'l': 'l',
        'litre': 'l',
        'cl': 'cl',
        'ml': 'ml',
        'c': 'cuillère à soupe',
        'cs': 'cuillère à soupe',
        'càs': 'cuillère à soupe',
        'cuil': 'cuillère à soupe',
        'c.': 'cuillère à soupe',
        'cc': 'cuillère à café',
        'càc': 'cuillère à café',
        'pièce': 'pièce',
        'pièces': 'pièce'
      };
      
      unit = unitMap[unit] || unit;
    } else {
      unit = 'pièce'; // Unité par défaut
    }
    
    // Nettoyage du nom
    name = name.trim();
    
    return {
      name,
      quantity,
      unit,
      optional: ingredientText.toLowerCase().includes('optionnel') || 
               ingredientText.toLowerCase().includes('facultatif')
    };
  }
  
  /**
   * Analyse un texte brut de recette
   * @param {string} text - Texte brut de la recette
   * @returns {Object} Structure de la recette extraite
   */
  static parseTextRecipe(text) {
    // Analyse de base du texte brut
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Trouver le titre (généralement la première ligne non vide)
    const title = lines[0];
    
    // Chercher la description (les lignes suivantes jusqu'à trouver un mot clé comme "Ingrédients" ou "Préparation")
    let descriptionLines = [];
    let currentSection = 'description';
    let ingredients = [];
    let steps = [];
    let prepTime = 0;
    let cookTime = 0;
    
    // Chercher les temps de préparation et cuisson
    const prepRegex = /préparation[:\s]+(\d+)[\s]*(min|minute|h|heure)/i;
    const cookRegex = /cuisson[:\s]+(\d+)[\s]*(min|minute|h|heure)/i;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Détecter les changements de section
      if (line.toLowerCase().includes('ingrédient')) {
        currentSection = 'ingredients';
        continue;
      } else if (line.toLowerCase().match(/préparation|instructions|étapes|recette/i) && !line.match(prepRegex)) {
        currentSection = 'steps';
        continue;
      }
      
      // Traiter selon la section
      if (currentSection === 'description') {
        // Chercher les temps dans la description
        const prepMatch = line.match(prepRegex);
        const cookMatch = line.match(cookRegex);
        
        if (prepMatch) {
          prepTime = parseInt(prepMatch[1], 10);
          if (prepMatch[2].startsWith('h')) prepTime *= 60;
        }
        
        if (cookMatch) {
          cookTime = parseInt(cookMatch[1], 10);
          if (cookMatch[2].startsWith('h')) cookTime *= 60;
        }
        
        // Si la ligne ne contient pas uniquement des infos de temps, l'ajouter à la description
        if (!line.match(/^(préparation|cuisson|temps total)[\s:]/i)) {
          descriptionLines.push(line);
        }
      } else if (currentSection === 'ingredients') {
        // Traiter les ingrédients
        // Ignorer les lignes de type titre ou trop courtes
        if (line.length > 3 && !line.endsWith(':')) {
          const parsedIngredient = this.parseIngredient(line);
          if (parsedIngredient) {
            ingredients.push(parsedIngredient);
          }
        }
      } else if (currentSection === 'steps') {
        // Traiter les étapes
        // Ignorer les titres et lignes trop courtes
        if (line.length > 10 && !line.endsWith(':')) {
          // Supprimer les numéros d'étape éventuels
          const cleanLine = line.replace(/^\d+[\.\)-]\s*/, '');
          
          steps.push({
            order: steps.length + 1,
            description: cleanLine,
            duration: 5 // Durée par défaut
          });
        }
      }
    }
    
    const description = descriptionLines.join(' ');
    
    // Déterminer les autres attributs
    const mealType = this.determineMealType(title, description);
    const difficultyLevel = this.determineDifficulty(prepTime, cookTime);
    const season = this.determineSeason(ingredients);
    
    return {
      title,
      description,
      prep_time: prepTime || 15, // Valeur par défaut si non trouvé
      cook_time: cookTime || 0,
      difficulty_level: difficultyLevel,
      meal_type: mealType,
      season,
      is_premium: false, // Par défaut
      servings: 4, // Valeur par défaut
      ingredients,
      steps,
      origin: '',
      nutrition_info: {}
    };
  }
  
  /**
   * Détermine le type de repas en fonction du titre et de la description
   * @param {string} title - Titre de la recette
   * @param {string} description - Description de la recette
   * @returns {string} Type de repas (breakfast, lunch, dinner, snack, dessert)
   */
  static determineMealType(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    if (text.match(/petit[- ]déjeuner|breakfast|brunch|matin/i)) return 'breakfast';
    if (text.match(/dessert|gâteau|tarte sucrée|crème|glace|chocolat/i)) return 'dessert';
    if (text.match(/goûter|snack|amuse[- ]bouche|apéritif|apéro/i)) return 'snack';
    if (text.match(/déjeuner|lunch|midi|entrée|salade/i)) return 'lunch';
    if (text.match(/dîner|dinner|soir|plat principal/i)) return 'dinner';
    
    // Par défaut
    return 'dinner';
  }
  
  /**
   * Détermine le niveau de difficulté en fonction des temps de préparation et cuisson
   * @param {number} prepTime - Temps de préparation en minutes
   * @param {number} cookTime - Temps de cuisson en minutes
   * @returns {string} Niveau de difficulté (easy, medium, hard)
   */
  static determineDifficulty(prepTime, cookTime) {
    const totalTime = prepTime + cookTime;
    
    if (totalTime > 60) return 'hard';
    if (totalTime > 30) return 'medium';
    return 'easy';
  }
  
  /**
   * Détermine la saison en fonction des ingrédients
   * @param {Array} ingredients - Liste des ingrédients
   * @returns {string} Saison (spring, summer, autumn, winter, all)
   */
  static determineSeason(ingredients) {
    // Liste d'ingrédients saisonniers
    const seasonalIngredients = {
      spring: ['asperge', 'petit pois', 'fraise', 'rhubarbe', 'artichaut'],
      summer: ['tomate', 'courgette', 'aubergine', 'poivron', 'pêche', 'abricot', 'melon'],
      autumn: ['potiron', 'citrouille', 'courge', 'champignon', 'châtaigne', 'raisin', 'pomme'],
      winter: ['choux', 'poireau', 'endive', 'agrume', 'orange', 'clémentine']
    };
    
    // Compter les occurrences d'ingrédients par saison
    const counts = { spring: 0, summer: 0, autumn: 0, winter: 0 };
    
    ingredients.forEach(ing => {
      const name = ing.name.toLowerCase();
      
      for (const [season, items] of Object.entries(seasonalIngredients)) {
        if (items.some(item => name.includes(item))) {
          counts[season]++;
        }
      }
    });
    
    // Trouver la saison avec le plus d'ingrédients
    let maxSeason = 'all';
    let maxCount = 0;
    
    for (const [season, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxSeason = season;
      }
    }
    
    // Si aucun ingrédient saisonnier n'est trouvé, retourner 'all'
    return maxCount > 0 ? maxSeason : 'all';
  }
  
  /**
   * Adapte la recette extraite au format de la base de données
   * @param {Object} extractedRecipe - Recette extraite
   * @returns {Object} Recette au format compatible avec la base de données
   */
  static adaptToDatabaseSchema(extractedRecipe) {
    // Transformation des ingrédients au format attendu par la base de données
    const ingredients = {
      ingredients: extractedRecipe.ingredients.map(ingredient => ({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        optional: ingredient.optional || false
      }))
    };
    
    // Transformation des étapes au format attendu par la base de données
    const steps = {
      steps: extractedRecipe.steps.map(step => ({
        order: step.order,
        description: step.description,
        duration: step.duration || 5 // Durée par défaut si non spécifiée
      }))
    };
    
    // Construction de l'objet final
    return {
      title: extractedRecipe.title,
      description: extractedRecipe.description,
      origin: extractedRecipe.origin || '',
      prep_time: extractedRecipe.prep_time,
      cook_time: extractedRecipe.cook_time || 0,
      difficulty_level: extractedRecipe.difficulty_level,
      meal_type: extractedRecipe.meal_type,
      season: extractedRecipe.season || 'all',
      is_premium: extractedRecipe.is_premium || false,
      premium_rank: extractedRecipe.is_premium ? 10 : null, // Valeur par défaut
      ingredients: JSON.stringify(ingredients),
      steps: JSON.stringify(steps),
      nutrition_info: JSON.stringify(extractedRecipe.nutrition_info || {}),
      servings: extractedRecipe.servings || 4,
      author_id: 1, // Admin par défaut
      image_url: extractedRecipe.image_url || ''
    };
  }
  
  /**
   * Génère une requête SQL d'insertion pour la recette
   * @param {Object} recipe - Recette validée
   * @returns {String} Requête SQL INSERT
   */
  static generateSqlInsert(recipe) {
    // Colonnes de la table recipes
    const columns = [
      'title', 'description', 'origin', 'prep_time', 'cook_time', 
      'difficulty_level', 'meal_type', 'season', 'is_premium', 'premium_rank',
      'ingredients', 'steps', 'nutrition_info', 'servings', 'author_id', 'image_url'
    ];
    
    // Valeurs pour l'insertion
    const values = [
      `'${recipe.title.replace(/'/g, "''")}'`,
      `'${recipe.description.replace(/'/g, "''")}'`,
      `'${recipe.origin?.replace(/'/g, "''") || ''}'`,
      recipe.prep_time,
      recipe.cook_time,
      `'${recipe.difficulty_level}'`,
      `'${recipe.meal_type}'`,
      `'${recipe.season}'`,
      recipe.is_premium,
      recipe.premium_rank ? recipe.premium_rank : 'NULL',
      `'${recipe.ingredients.replace(/'/g, "''")}'`,
      `'${recipe.steps.replace(/'/g, "''")}'`,
      `'${recipe.nutrition_info || '{}'}'`,
      recipe.servings,
      recipe.author_id || 1, // Admin par défaut
      `'${recipe.image_url || ''}'`
    ];
    
    return `INSERT INTO recipes (${columns.join(', ')})
VALUES (${values.join(', ')});`;
  }
  
  /**
   * Valide la recette avec le schéma Joi
   * @param {Object} recipe - Recette à valider
   * @returns {Promise<Object>} Recette validée
   */
  static async validateRecipe(recipe) {
    try {
      // Conversion des JSON en objets pour la validation
      const recipeForValidation = {
        ...recipe,
        ingredients: JSON.parse(recipe.ingredients).ingredients,
        steps: JSON.parse(recipe.steps).steps
      };
      
      const { error, value } = recipeSchema.validate(recipeForValidation);
      
      if (error) {
        throw new Error(`Validation failed: ${error.message}`);
      }
      
      return value;
    } catch (error) {
      console.error('Erreur de validation:', error);
      throw error;
    }
  }
}

export default RecipeExtractor;