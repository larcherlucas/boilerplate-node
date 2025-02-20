import ApiError from '../erros/api.error.js';
import menusDataMapper from '../datamappers/menus.js';
import { menuSchema } from '../validations/schemas/menus.js';

const menusController = {
  async getAll(req, res, next) {
    try {
      const menus = await menusDataMapper.findAll(req.user.id);
      res.json(menus);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const menu = await menusDataMapper.findById(req.params.id, req.user.id);
      if (!menu) {
        throw new ApiError(404, 'Menu not found');
      }
      res.json(menu);
    } catch (error) {
      next(error);
    }
  },

  async getActive(req, res, next) {
    try {
      const menus = await menusDataMapper.findActive(req.user.id);
      res.json(menus);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { error, value } = menuSchema.validate(req.body);
      if (error) {
        throw new ApiError(400, error.message);
      }
      const newMenu = await menusDataMapper.create(req.user.id, value);
      res.status(201).json(newMenu);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { error, value } = menuSchema.validate(req.body);
      if (error) {
        throw new ApiError(400, error.message);
      }
      const updatedMenu = await menusDataMapper.update(req.params.id, req.user.id, value);
      if (!updatedMenu) {
        throw new ApiError(404, 'Menu not found');
      }
      res.json(updatedMenu);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const deletedMenu = await menusDataMapper.delete(req.params.id, req.user.id);
      if (!deletedMenu) {
        throw new ApiError(404, 'Menu not found');
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
};

export default menusController;