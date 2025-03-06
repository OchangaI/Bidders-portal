import express from 'express';
import { 
    registerMembership, 
    getAllMembers, 
    checkMembershipStatus,
    getMemberById,
    updateMembership,
    deleteMembership
} from '../controllers/membershipController.js';
import Membership from '../models/Membership.js';

const router = express.Router();

router.post('/membership/register', registerMembership);
router.get('/membership/all', getAllMembers);
router.get('/membership/status/:email', checkMembershipStatus);
router.get('membership/:id', getMemberById);
router.put('membership/:id', updateMembership);
router.delete('membership/:id', deleteMembership);


export default router;
