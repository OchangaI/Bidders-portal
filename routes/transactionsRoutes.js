import express from 'express';
import axios from 'axios';

const router = express.Router();

const INTASEND_API_KEY = process.env.INTASEND_PUBLIC_KEY;
const BASE_URL = 'https://api.intasend.com/api/v1';

const fetchTransactions = async () => {
  try {
    const { data } = await axios.get(`${BASE_URL}/payment`, {
      headers: {
        Authorization: `Bearer ${INTASEND_API_KEY}`
      }
    });
    return data.results || [];
  } catch (error) {
    console.error('Error fetching IntaSend transactions:', error.message);
    return [];
  }
};

const groupRevenueByDate = (transactions) => {
  return transactions.reduce((acc, tx) => {
    if (tx.status !== 'SUCCESSFUL') return acc;

    const date = new Date(tx.created_on).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + parseFloat(tx.amount);
    return acc;
  }, {});
};

router.get('/revenue', async (req, res) => {
  try {
    const transactions = await fetchTransactions();
    const groupedRevenue = groupRevenueByDate(transactions);
    res.json(groupedRevenue);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
