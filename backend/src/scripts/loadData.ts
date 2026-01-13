#!/usr/bin/env ts-node

import path from 'path';
import dataIngestionService from '../services/dataIngestionService';
import logger from '../services/logger';
import db from '../database/connection';

async function main() {
  try {
    const args = process.argv.slice(2);

    // Default to repository-level data files (works regardless of CWD)
    const defaultEvents = path.resolve(__dirname, '../../../data/events.json');
    const defaultPredictions = path.resolve(__dirname, '../../../data/predictions.json');

    if (args.length > 2) {
      console.log('Usage: ts-node src/scripts/loadData.ts [events.json] [predictions.json]');
      console.log('Example: ts-node src/scripts/loadData.ts ../data/events.json ../data/predictions.json');
      process.exit(1);
    }

    const eventsArg = args[0];
    const predictionsArg = args[1];

    const eventsPath = path.resolve(eventsArg ?? defaultEvents);
    const predictionsPath = path.resolve(predictionsArg ?? defaultPredictions);

    logger.info('Starting data load script', { eventsPath, predictionsPath });

    const result = await dataIngestionService.loadData(eventsPath, predictionsPath);

    logger.info('Data load completed successfully', {
      eventsLoaded: result.eventIds.length,
      predictionsLoaded: result.predictionIds.length,
    });

    console.log('\n✅ Data loaded successfully!');
    console.log(`   Events: ${result.eventIds.length}`);
    console.log(`   Predictions: ${result.predictionIds.length}`);

    await db.close();
    process.exit(0);
  } catch (error: any) {
    logger.error('Data load script failed', { error: error.message, stack: error.stack });
    console.error('\n❌ Data load failed:', error.message);
    await db.close();
    process.exit(1);
  }
}

main();
