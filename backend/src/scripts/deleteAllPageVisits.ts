#!/usr/bin/env node

/**
 * Script to delete all page visits from the database
 * 
 * This script will:
 * 1. Connect to the MongoDB database
 * 2. Delete all documents from the PageVisit collection
 * 3. Delete all related CoinTransaction records for page visits
 * 4. Optionally restore coins to users who spent them on page visits
 * 
 * Usage:
 *   npm run delete-page-visits
 *   or
 *   npx ts-node src/scripts/deleteAllPageVisits.ts
 * 
 * Options:
 *   --restore-coins: Also restore coins to users who spent them on page visits
 *   --dry-run: Show what would be deleted without actually deleting
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PageVisit from '../models/PageVisit';
import { CoinTransaction } from '../models';
import { User } from '../models';

// Load environment variables
dotenv.config();

interface DeletionStats {
  pageVisitsDeleted: number;
  coinTransactionsDeleted: number;
  coinsRestored: number;
  usersUpdated: number;
}

class PageVisitCleaner {
  private isDryRun: boolean = false;
  private shouldRestoreCoins: boolean = false;

  constructor() {
    // Parse command line arguments
    this.isDryRun = process.argv.includes('--dry-run');
    this.shouldRestoreCoins = process.argv.includes('--restore-coins');
  }

  async connectToDatabase(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      process.exit(1);
    }
  }

  async getPageVisitStats(): Promise<void> {
    try {
      const totalVisits = await PageVisit.countDocuments();
      const totalCoinsSpent = await PageVisit.aggregate([
        { $group: { _id: null, totalCoins: { $sum: '$coinsConsumed' } } }
      ]);

      const coinTransactions = await CoinTransaction.countDocuments({
        description: { $regex: /Page visit:|page visit/i }
      });

      console.log('\n📊 Current Page Visit Statistics:');
      console.log(`   • Total page visits: ${totalVisits}`);
      console.log(`   • Total coins spent on page visits: ${totalCoinsSpent[0]?.totalCoins || 0}`);
      console.log(`   • Related coin transactions: ${coinTransactions}`);
    } catch (error) {
      console.error('❌ Error getting page visit statistics:', error);
    }
  }

  async deletePageVisits(): Promise<DeletionStats> {
    const stats: DeletionStats = {
      pageVisitsDeleted: 0,
      coinTransactionsDeleted: 0,
      coinsRestored: 0,
      usersUpdated: 0
    };

    try {
      // Step 1: Get all page visits and calculate coin restoration data
      console.log('\n🔍 Analyzing page visits for deletion...');
      const pageVisits = await PageVisit.find({}).lean();
      stats.pageVisitsDeleted = pageVisits.length;

      if (this.shouldRestoreCoins) {
        console.log('💰 Calculating coins to restore...');
        
        // Group by user and sum coins consumed
        const userCoinMap = new Map<string, number>();
        for (const visit of pageVisits) {
          const userId = visit.userId.toString();
          const currentCoins = userCoinMap.get(userId) || 0;
          userCoinMap.set(userId, currentCoins + (visit.coinsConsumed || 0));
        }

        if (!this.isDryRun) {
          console.log('🔄 Restoring coins to users...');
          for (const [userId, coinsToRestore] of userCoinMap.entries()) {
            if (coinsToRestore > 0) {
              await User.findByIdAndUpdate(
                userId,
                { $inc: { coinBalance: coinsToRestore } }
              );
              stats.coinsRestored += coinsToRestore;
              stats.usersUpdated++;
            }
          }
        } else {
          // For dry run, just calculate what would be restored
          for (const coinsToRestore of userCoinMap.values()) {
            stats.coinsRestored += coinsToRestore;
            if (coinsToRestore > 0) stats.usersUpdated++;
          }
        }
      }

      // Step 2: Delete related coin transactions
      console.log('🧹 Finding related coin transactions...');
      const coinTransactionQuery = {
        $or: [
          { description: { $regex: /Page visit:/i } },
          { description: { $regex: /page visit/i } },
          { type: 'spent', referenceId: { $in: pageVisits.map(v => v._id) } }
        ]
      };

      const coinTransactionsCount = await CoinTransaction.countDocuments(coinTransactionQuery);
      stats.coinTransactionsDeleted = coinTransactionsCount;

      if (!this.isDryRun) {
        console.log('🗑️  Deleting coin transactions...');
        await CoinTransaction.deleteMany(coinTransactionQuery);
      }

      // Step 3: Delete all page visits
      if (!this.isDryRun) {
        console.log('🗑️  Deleting all page visits...');
        await PageVisit.deleteMany({});
      }

      return stats;
    } catch (error) {
      console.error('❌ Error during deletion process:', error);
      throw error;
    }
  }

  async run(): Promise<void> {
    console.log('🚀 Page Visit Database Cleaner');
    console.log('================================');
    
    if (this.isDryRun) {
      console.log('🧪 DRY RUN MODE - No changes will be made');
    }
    
    if (this.shouldRestoreCoins) {
      console.log('💰 COIN RESTORATION MODE - Coins will be restored to users');
    }

    console.log('');

    await this.connectToDatabase();
    await this.getPageVisitStats();

    console.log('\n⚠️  WARNING: This will permanently delete all page visit data!');
    
    if (!this.isDryRun) {
      console.log('🚨 This is NOT a dry run - data will be permanently deleted!');
      
      // Give user a chance to cancel (in production, you might want to require confirmation)
      console.log('\n⏳ Starting deletion in 5 seconds... Press Ctrl+C to cancel');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('\n🔥 Starting cleanup process...');
    const stats = await this.deletePageVisits();

    console.log('\n✅ Cleanup completed successfully!');
    console.log('📈 Deletion Summary:');
    console.log(`   • Page visits ${this.isDryRun ? 'to be deleted' : 'deleted'}: ${stats.pageVisitsDeleted}`);
    console.log(`   • Coin transactions ${this.isDryRun ? 'to be deleted' : 'deleted'}: ${stats.coinTransactionsDeleted}`);
    
    if (this.shouldRestoreCoins) {
      console.log(`   • Coins ${this.isDryRun ? 'to be restored' : 'restored'}: ${stats.coinsRestored}`);
      console.log(`   • Users ${this.isDryRun ? 'to be updated' : 'updated'}: ${stats.usersUpdated}`);
    }

    console.log('\n🎉 Database is now clean and ready for production!');
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Main execution
async function main() {
  const cleaner = new PageVisitCleaner();
  
  try {
    await cleaner.run();
  } catch (error) {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  } finally {
    await cleaner.disconnect();
    process.exit(0);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

export default PageVisitCleaner;