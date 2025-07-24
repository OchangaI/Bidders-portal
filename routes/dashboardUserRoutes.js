import express from 'express';
import {
  register,
  login,
  getAll,
  update,
  remove
} from '../controllers/dashboardUserController.js';
import { required, optional } from '../middleware/dashboardUserAuth.js';

const router = express.Router();

router.post('/register', optional, register);
router.post('/login', login);
router.get('/', required, getAll);
router.put('/:id', required, update);
router.delete('/:id', required, remove);

export default router;