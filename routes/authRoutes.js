import express from 'express';
import { 
    register, 
    login, 
    googleLogin,
    getUsers,
    getUserById,
    updateUser,
    deleteUser 
} from '../controllers/authController.js';
import User from '../models/User.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);


export default router;
