// POS Integration Service
// Handles synchronization with Point of Sale systems

const MenuItem = require('../database/models/MenuItem');
const logger = require('../logger');

class POSService {
  constructor() {
    this.lastSync = null;
    this.syncInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Sync menu items from POS system
   * @param {Array} posMenuItems - Array of menu items from POS
   * @param {String} venue - 'la-brewha' or 'bean-and-bud'
   */
  async syncMenu(posMenuItems, venue) {
    try {
      const syncResults = {
        updated: 0,
        created: 0,
        errors: []
      };

      for (const posItem of posMenuItems) {
        try {
          // Find existing item by POS ID
          let menuItem = await MenuItem.findOne({ posId: posItem.id });

          if (menuItem) {
            // Update existing item
            await menuItem.syncFromPOS(posItem);
            syncResults.updated++;
          } else {
            // Create new item
            menuItem = new MenuItem({
              name: posItem.name,
              description: posItem.description || posItem.name,
              venue: venue,
              category: this.mapCategory(posItem.category),
              price: posItem.price,
              available: posItem.available !== false,
              inStock: posItem.inStock !== false,
              posId: posItem.id,
              barcode: posItem.barcode,
              sku: posItem.sku,
              image: posItem.image || '/images/menu/default.jpg'
            });

            await menuItem.save();
            syncResults.created++;
          }
        } catch (itemError) {
          syncResults.errors.push({
            item: posItem.id,
            error: itemError.message
          });
        }
      }

      this.lastSync = new Date();
      logger.info(`POS Sync completed for ${venue}:`, syncResults);

      return syncResults;
    } catch (error) {
      logger.error('POS Sync failed:', error);
      throw error;
    }
  }

  /**
   * Map POS category to our schema categories
   */
  mapCategory(posCategory) {
    const categoryMap = {
      'COFFEE': 'coffee',
      'ESPRESSO': 'espresso',
      'SPECIALTY': 'specialty-drinks',
      'TEA': 'tea',
      'SMOOTHIE': 'smoothies',
      'JUICE': 'juices',
      'FOOD': 'food',
      'PASTRY': 'pastries',
      'BREAKFAST': 'breakfast',
      'LUNCH': 'lunch',
      'CBD': 'cbd-infused',
      'PAIRING': 'cannabis-pairing'
    };

    return categoryMap[posCategory?.toUpperCase()] || 'food';
  }

  /**
   * Update inventory from POS
   */
  async updateInventory(inventoryUpdates) {
    try {
      const results = [];

      for (const update of inventoryUpdates) {
        const menuItem = await MenuItem.findOne({ posId: update.id });

        if (menuItem) {
          menuItem.inStock = update.inStock;
          menuItem.available = update.available !== undefined ? update.available : menuItem.available;
          await menuItem.save();
          results.push({ id: update.id, success: true });
        } else {
          results.push({ id: update.id, success: false, reason: 'Item not found' });
        }
      }

      return results;
    } catch (error) {
      logger.error('Inventory update failed:', error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      lastSync: this.lastSync,
      nextSync: this.lastSync ? new Date(this.lastSync.getTime() + this.syncInterval) : null,
      isOverdue: this.lastSync ? Date.now() - this.lastSync.getTime() > this.syncInterval : true
    };
  }

  /**
   * Push order to POS (for kitchen/barista display)
   */
  async pushOrder(order) {
    try {
      // This would integrate with your actual POS system
      // For now, we'll just log it
      logger.info('Pushing order to POS:', {
        orderId: order._id,
        items: order.items.length,
        total: order.total
      });

      // TODO: Implement actual POS API integration
      // Example: await axios.post(POS_API_URL + '/orders', orderData);

      return {
        success: true,
        posOrderId: `POS-${order._id}-${Date.now()}`,
        sentAt: new Date()
      };
    } catch (error) {
      logger.error('Push to POS failed:', error);
      throw error;
    }
  }
}

module.exports = new POSService();
