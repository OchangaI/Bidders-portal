import Tender from '../models/Tender.js';
import dotenv from 'dotenv';
import axios from 'axios';
import cron from 'node-cron';

dotenv.config();

// URL of the tender API

import fs from 'fs/promises'; // Use promises for async file handling

// const jsonFilePath = '../tenders.json'; // Update the path if needed
import path from 'path';
const jsonFilePath = path.resolve('tenders.json'); // Make sure tenders.json is in root


const fetchTendersFromApi = async () => {
  try {
    // Read the JSON file
    const data = await fs.readFile(jsonFilePath, 'utf-8');

    // Parse the JSON
    const tendersData = JSON.parse(data);

    // Extract tenders
    const tenders = tendersData.TenderDetails.flatMap(item => item.TenderLists || []);
    
    return tenders;
  } catch (error) {
    console.error('Error fetching tenders from JSON file:', error);
    return [];
  }
};



// Example usage
// fetchTendersFromJson().then(tenders => console.log(tenders));


// Load tenders from the API and populate the database
export const loadInitialData = async () => {
  try {
    // Try fetching from JSON
    const tenders = await fetchTendersFromApi();

    if (tenders.length === 0) {
      console.log('No tenders found in JSON file. Falling back to database tenders.');
      return; // If JSON fetch fails, we only use database tenders.
    }

    // Save to database
    for (const tender of tenders) {
      await Tender.updateOne(
        { BDR_No: tender.BDR_No }, // Use BDR_No as a unique identifier
        { $set: tender },
        { upsert: true }
      );
    }

    console.log('Tenders data loaded from the JSON file into the database.');
  } catch (error) {
    console.error('Failed to load tenders from the JSON file:', error);
  }
};


// Load tenders every 30 minutes
// cron.schedule('*/30 * * * *', async () => {
//   console.log('Refreshing tenders...');
//   await loadInitialData();
// });


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

export const getAllTenders = async (req, res) => {
  try {
    const tenders = await Tender.find(); // If fetching from DB
    // OR
    // const tenders = await fetchTendersFromApi();
    res.status(200).json(tenders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenders' });
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
