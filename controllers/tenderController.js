import Tender from '../models/Tender.js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// URL of the tender API
const tenderApiUrl = process.env.TENDER_API_URL;

// Fetch tenders from the provided API URL
const fetchTendersFromApi = async () => {
  try {
    const response = await axios.get(tenderApiUrl);
    // Extract tender details from the response
    const tenders = response.data.TenderDetails.flatMap(item => item.TenderLists || []);
    return tenders;
  } catch (error) {
    console.error('Error fetching tenders from API:', error);
    return [];
  }
};

// Load tenders from the API and populate the database
export const loadInitialData = async () => {
  try {
    // Fetch tenders from the API
    const tenders = await fetchTendersFromApi();

    // Iterate over the fetched tenders and insert them into the database
    for (const tender of tenders) {
      await Tender.updateOne(
        { BDR_No: tender.BDR_No }, // Use BDR_No as a unique identifier
        { $set: tender },
        { upsert: true }
      );
    }

    console.log('Tenders data loaded from the API into the database.');
  } catch (error) {
    console.error('Failed to load tenders from the API:', error);
  }
};

// Get all tenders with optional filters
export const getTenders = async (req, res) => {
  try {
    const { title, category, method, country, startDate, endDate } = req.query;

    const filter = {};
    if (title) filter.Tender_Brief = new RegExp(title, 'i'); // Case-insensitive search
    if (category) filter.Tender_Category = category;
    if (method) filter.CompetitionType = method;
    if (country) filter.Country = country;
    if (startDate && endDate) {
      filter.Tender_Expiry = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const tenders = await Tender.find(filter);
    res.status(200).json(tenders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tenders.', error });
  }
};

// Create a new tender
export const createTender = async (req, res) => {
  try {
    const newTender = new Tender(req.body);
    await newTender.save();
    res.status(201).json(newTender);
  } catch (error) {
    res.status(400).json({ message: 'Error creating tender.', error });
  }
};

// Update an existing tender
export const updateTender = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTender = await Tender.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.status(200).json(updatedTender);
  } catch (error) {
    res.status(400).json({ message: 'Error updating tender.', error });
  }
};

// Delete a tender
export const deleteTender = async (req, res) => {
  try {
    const { id } = req.params;
    await Tender.findByIdAndDelete(id);
    res.status(200).json({ message: 'Tender deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting tender.', error });
  }
};
