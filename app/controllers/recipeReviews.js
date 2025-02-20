import ApiError from '../erros/api.error.js';
import recipeReviewsDataMapper from '../datamappers/recipeReviews.js';
import { recipeReviewSchema } from '../validations/schemas/recipeReviews.js';

const recipeReviewsController = {
  async getAllByRecipe(req, res, next) {
    try {
      const recipeExists = await recipeReviewsDataMapper.checkRecipeExists(req.params.recipeId);
      if (!recipeExists) {
        throw new ApiError(404, 'Recipe not found');
      }

      const reviews = await recipeReviewsDataMapper.findAllByRecipe(req.params.recipeId);
      res.json(reviews);
    } catch (error) {
      next(error);
    }
  },

  async getAllByUser(req, res, next) {
    try {
      const reviews = await recipeReviewsDataMapper.findAllByUser(req.user.id);
      res.json(reviews);
    } catch (error) {
      next(error);
    }
  },

  async getStats(req, res, next) {
    try {
      const recipeExists = await recipeReviewsDataMapper.checkRecipeExists(req.params.recipeId);
      if (!recipeExists) {
        throw new ApiError(404, 'Recipe not found');
      }

      const stats = await recipeReviewsDataMapper.getRecipeStats(req.params.recipeId);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { error, value } = recipeReviewSchema.validate(req.body);
      if (error) {
        throw new ApiError(400, error.message);
      }

      const recipeExists = await recipeReviewsDataMapper.checkRecipeExists(req.params.recipeId);
      if (!recipeExists) {
        throw new ApiError(404, 'Recipe not found');
      }

      const existingReview = await recipeReviewsDataMapper.findOne(req.user.id, req.params.recipeId);
      if (existingReview) {
        throw new ApiError(400, 'You have already reviewed this recipe');
      }

      const newReview = await recipeReviewsDataMapper.create(
        req.user.id,
        req.params.recipeId,
        value
      );
      res.status(201).json(newReview);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { error, value } = recipeReviewSchema.validate(req.body);
      if (error) {
        throw new ApiError(400, error.message);
      }

      const updatedReview = await recipeReviewsDataMapper.update(
        req.user.id,
        req.params.recipeId,
        value
      );
      if (!updatedReview) {
        throw new ApiError(404, 'Review not found');
      }
      res.json(updatedReview);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const deletedReview = await recipeReviewsDataMapper.delete(req.user.id, req.params.recipeId);
      if (!deletedReview) {
        throw new ApiError(404, 'Review not found');
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
};

export default recipeReviewsController;