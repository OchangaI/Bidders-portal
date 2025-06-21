import mongoose from 'mongoose';
import Tender from '../models/Tender.js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

const jsonFilePath = path.resolve('tenders.json');
// const MONGO_URI = process.env.MONGO_URI;

const importTenders = async () => {
  try {
    await mongoose.connect('mongodb+srv://danfdev6:Danf102020!@cluster0.yeci2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

    const data = await fs.readFile(jsonFilePath, 'utf-8');
    const tendersData = JSON.parse(data);

    if (!tendersData.TenderDetails || !Array.isArray(tendersData.TenderDetails)) {
      throw new Error('Invalid JSON format: Missing TenderDetails array.');
    }

    const tenders = tendersData.TenderDetails.flatMap(item => item?.TenderLists || []);

    for (const tender of tenders) {
      await Tender.updateOne(
        { BDR_No: tender.BDR_No },
        { $set: tender },
        { upsert: true }
      );
    }

    console.log('Tenders successfully imported into the database.');
    process.exit(0);
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  }
};

importTenders();
