import ApiError from '../erros/api.error.js';
import seasonalItemsDataMapper from '../datamappers/seasonalItems.js';
import { seasonalItemSchema } from '../validations/schemas/seasonalItems.js';

const seasonalItemsController = {
  async getAll(_, res, next) {
    try {
      const items = await seasonalItemsDataMapper.findAll();
      res.json(items);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const item = await seasonalItemsDataMapper.findById(req.params.id);
      if (!item) {
        throw new ApiError(404, 'Seasonal item not found');
      }
      res.json(item);
    } catch (error) {
      next(error);
    }
  },

  async getByType(req, res, next) {
    try {
      const items = await seasonalItemsDataMapper.findByType(req.params.type);
      res.json(items);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { error, value } = seasonalItemSchema.validate(req.body);
      if (error) {
        throw new ApiError(400, error.message);
      }
      const newItem = await seasonalItemsDataMapper.create(value);
      res.status(201).json(newItem);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { error, value } = seasonalItemSchema.validate(req.body);
      if (error) {
        throw new ApiError(400, error.message);
      }
      const updatedItem = await seasonalItemsDataMapper.update(req.params.id, value);
      if (!updatedItem) {
        throw new ApiError(404, 'Seasonal item not found');
      }
      res.json(updatedItem);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const deletedItem = await seasonalItemsDataMapper.delete(req.params.id);
      if (!deletedItem) {
        throw new ApiError(404, 'Seasonal item not found');
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
};

export default seasonalItemsController;