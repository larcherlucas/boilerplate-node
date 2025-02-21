/* eslint-disable import/extensions */
import express from 'express';
import { loginSchema, postSchema } from '../../validations/schemas/account.js';
import validate from '../../validations/validator.js';
import cw from '../../middlewares/controller.wrapper.js';
import accountController from '../../controllers/account.js';

const router = express.Router();

/**
*POST /api/login/
*@summary Post connexion of connexion by connexion id
*@tags Post
*@param {number} id.path.required - connexion id
*@param {loginInput} request.body.required - Profile info { email, password }
*@return {ApiSucces} 200 - Success response - application/json
*@return {ApiJsonError} 400 - Bad Request - application/json
*@return {ApiJsonError} 401 - Unauthorized - application/json
*@return {ApiJsonError} 404 - Not Found - application/json
*@return {ApiJsonError} 500 - Internal Server Error - application/json
*/

router.post('/login/', validate(loginSchema, 'body'), cw(accountController.loginForm));

/**
 * POST /api/logout/
 * @summary Post logout of connexion by connexion id
 * @tags Post
 * @param {number} id.path.required - connexion id
 * @param {loginInput} request.body.required - Profile info { email, password }
 * @return {ApiSucces} 200 - Success response - application/json
 * @return {ApiJsonError} 400 - Bad Request - application/json
 * @return {ApiJsonError} 401 - Unauthorized - application/json
 * @return {ApiJsonError} 404 - Not Found - application/json
 * @return {ApiJsonError} 500 - Internal Server Error - application/json
 * @description After logout, the user is redirected to the landing page
 */
router.post('/logout/', cw(accountController.logout));

export default router;