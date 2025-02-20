import ApiError from '../erros/api.error.js';
import dietaryRestrictionsDataMapper from '../datamappers/dietaryRestrictions.js';
import { dietaryRestrictionSchema } from '../validations/schemas/dietaryRestrictions.js';

const dietaryRestrictionsController = {
  async getAll(req, res, next) {
    try {
      const restrictions = await dietaryRestrictionsDataMapper.findAllByUser(req.user.id);
      res.json(restrictions);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { error, value } = dietaryRestrictionSchema.validate(req.body);
      if (error) {
        throw new ApiError(400, error.message);
      }

      const existing = await dietaryRestrictionsDataMapper.findOne(
        req.user.id,
        value.restriction_type
      );
      if (existing) {
        throw new ApiError(400, 'Restriction type already exists for this user');
      }

      const newRestriction = await dietaryRestrictionsDataMapper.create(req.user.id, value);
      res.status(201).json(newRestriction);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { error, value } = dietaryRestrictionSchema.validate(req.body);
      if (error) {
        throw new ApiError(400, error.message);
      }

      const updatedRestriction = await dietaryRestrictionsDataMapper.update(
        req.user.id,
        req.params.type,
        value
      );
      if (!updatedRestriction) {
        throw new ApiError(404, 'Dietary restriction not found');
      }
      res.json(updatedRestriction);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const deletedRestriction = await dietaryRestrictionsDataMapper.delete(
        req.user.id,
        req.params.type
      );
      if (!deletedRestriction) {
        throw new ApiError(404, 'Dietary restriction not found');
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },

  async deleteAll(req, res, next) {
    try {
      await dietaryRestrictionsDataMapper.deleteAll(req.user.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
};

export default dietaryRestrictionsController;