/**
 * PureGro Stock Seed Script
 * Seeds production inventory from Meri Jane Ormonde / Matla stock data
 * Based on stock take from 30 January 2026
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const Product = require('../modules/database/models/Product');
const BranchInventory = require('../modules/database/models/BranchInventory');
const Branch = require('../modules/database/models/Branch');

// Matla's Stock from Excel (POWER column) - Combined from Office Store Room and Back Store Room
// Using valid Product model categories: flower, pre-rolls, concentrates, edibles, oils, topicals, vapes, accessories, lifestyle-cbd, coffee
// Grow Types: 'indoor' = Indoor, 'greendoor' = Greendoor
const matlaStock = {
  // GREENDOOR Strains - category: flower, subcategory: hybrid, tag: greendoor
  'Jungle Diamond': { qty: 1013 + 449.5, price: 70, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['greendoor'] },
  'Cheese': { qty: 660 + 300, price: 60, category: 'flower', subcategory: 'indica', unit: 'g', tags: ['greendoor'] },
  'Excel Cheese': { qty: 1000, price: 60, category: 'flower', subcategory: 'indica', unit: 'g', tags: ['greendoor'] },
  'Divine Storm': { qty: 890, price: 70, category: 'flower', subcategory: 'sativa', unit: 'g', tags: ['greendoor'] },
  'Alien Cookies': { qty: 943 + 274, price: 60, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['greendoor'] },
  'Gary Payton': { qty: 490 + 57.5, price: 70, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['greendoor'] },
  'XL': { qty: 1000 + 397.5, price: 50, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['greendoor', 'value'] },
  'Jell-O': { qty: 316, price: 60, category: 'flower', subcategory: 'indica', unit: 'g', tags: ['greendoor'] },
  'Black Cherry Punch': { qty: 215, price: 70, category: 'flower', subcategory: 'indica', unit: 'g', tags: ['greendoor'] },
  'Super Cheese': { qty: 75, price: 50, category: 'flower', subcategory: 'indica', unit: 'g', tags: ['greendoor', 'value'] },
  'Prime Cheese': { qty: 188.5, price: 60, category: 'flower', subcategory: 'indica', unit: 'g', tags: ['greendoor'] },
  'Strawberry Lemonade': { qty: 261, price: 40, category: 'flower', subcategory: 'sativa', unit: 'g', tags: ['greendoor', 'special'] },
  'Beach Wedding': { qty: 178, price: 60, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['greendoor'] },
  'Durban Sky': { qty: 20, price: 40, category: 'flower', subcategory: 'sativa', unit: 'g', tags: ['greendoor', 'local'] },
  'Gorilla Zkittles': { qty: 109.5, price: 60, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['greendoor'] },

  // INDOOR Strains - category: flower, tags: indoor
  'K-Snow': { qty: 178 + 163.5, price: 80, category: 'flower', subcategory: 'indica', unit: 'g', tags: ['indoor'] },
  'Zoap': { qty: 216 + 256.5, price: 80, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor'] },
  'White Runtz': { qty: 387, price: 100, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor', 'premium'] },
  'Queen of the South': { qty: 447, price: 120, category: 'flower', subcategory: 'sativa', unit: 'g', tags: ['indoor', 'premium'] },
  'Mochi': { qty: 384, price: 120, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor', 'premium'] },
  'Purple Peanut Butter': { qty: 835 + 36.5, price: 100, category: 'flower', subcategory: 'indica', unit: 'g', tags: ['indoor'] },
  'Pitbull Pops': { qty: 1000, price: 100, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor'] },
  'Pitbull': { qty: 750 + 47, price: 100, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor'] },
  'Face On Fire': { qty: 42, price: 120, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor', 'premium'] },
  'Ice Queen': { qty: 118, price: 120, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor', 'premium'] },
  'Frozen Peach': { qty: 88.5, price: 150, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor', 'exotic'] },
  'Blue Pava': { qty: 85, price: 150, category: 'flower', subcategory: 'indica', unit: 'g', tags: ['indoor', 'exotic'] },
  'Block Berry': { qty: 312.5 + 721, price: 120, category: 'flower', subcategory: 'indica', unit: 'g', tags: ['indoor'] },
  'Pink Runtz': { qty: 456, price: 80, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor'] },
  'King Truck': { qty: 40.5, price: 100, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor'] },
  'Bakers': { qty: 41.5, price: 80, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor'] },
  'Ice Cream Cake': { qty: 216, price: 100, category: 'flower', subcategory: 'indica', unit: 'g', tags: ['indoor'] },
  'Blu Zuchi': { qty: 93, price: 150, category: 'flower', subcategory: 'indica', unit: 'g', tags: ['indoor', 'exotic'] },
  'Rainbow Sherbet': { qty: 67, price: 150, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor', 'exotic'] },
  'Rainbow Royale': { qty: 37.9, price: 150, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor', 'exotic'] },
  'Don Perinon': { qty: 37.51, price: 120, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor', 'premium'] },
  'Monster Zkittles': { qty: 50, price: 100, category: 'flower', subcategory: 'indica', unit: 'g', tags: ['indoor'] },
  'Blackberry': { qty: 87.26, price: 100, category: 'flower', subcategory: 'indica', unit: 'g', tags: ['indoor'] },

  // KRUSH/SHAKE - category: flower, tags: shake
  'MJ Roll Mix': { qty: 750 + 750, price: 30, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['shake', 'value'] },
  'Gold Roll Mix': { qty: 1098 + 1098, price: 25, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['shake', 'value'] },
  'Gold Roll Krush': { qty: 1000 + 1000, price: 25, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['shake', 'value'] },
  'Gold Roll Flower Mix': { qty: 2000 + 2000, price: 25, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['shake', 'value'] },
  'MJ Krush': { qty: 813 + 813, price: 30, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['shake', 'value'] },
  'Kief': { qty: 471 + 471, price: 100, category: 'concentrates', subcategory: 'hash', unit: 'g', tags: ['concentrate'] },

  // POPS (Pre-made bags)
  "Dante's Inferno": { qty: 747.5 + 156.5, price: 80, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['indoor'] },

  // PRE-ROLLS - category: pre-rolls
  'Gold Rolls': { qty: 500 + 1000, price: 50, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['value'] },
  'Moonsticks': { qty: 36 + 36, price: 80, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['premium'] },
  'MJ Pre-Rolls': { qty: 1500, price: 80, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: [] },
  'Honeycomb Pre-Roll': { qty: 68, price: 100, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['infused'] },
  'Moon Stick (G.D)': { qty: 82, price: 80, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['greendoor'] },
  'Moon Stick (I.D)': { qty: 75, price: 100, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['indoor'] },

  // EDIBLES - category: edibles
  'Toffees 150mg': { qty: 10, price: 180, category: 'edibles', subcategory: 'chocolates', unit: 'units', tags: [] },
  'Fruit Pastelles 150mg': { qty: 4, price: 180, category: 'edibles', subcategory: 'gummies', unit: 'units', tags: [] },
  'Rainbow Strips 200mg': { qty: 12, price: 240, category: 'edibles', subcategory: 'gummies', unit: 'units', tags: [] },
  'Red Ropes 200mg': { qty: 8, price: 240, category: 'edibles', subcategory: 'gummies', unit: 'units', tags: [] },
  'Loaded Leaf 200mg': { qty: 12, price: 240, category: 'edibles', subcategory: 'gummies', unit: 'units', tags: [] },
  'Blazed Blocks 150mg': { qty: 8, price: 180, category: 'edibles', subcategory: 'chocolates', unit: 'units', tags: [] },
  'OG Gummies 330mg': { qty: 13, price: 350, category: 'edibles', subcategory: 'gummies', unit: 'units', tags: ['high-dose'] },
  'OG Gummies 150mg': { qty: 21, price: 180, category: 'edibles', subcategory: 'gummies', unit: 'units', tags: [] },
  'Heart Stopper 200mg': { qty: 7, price: 200, category: 'edibles', subcategory: 'gummies', unit: 'units', tags: [] },
  'Heart Stopper 400mg': { qty: 13, price: 400, category: 'edibles', subcategory: 'gummies', unit: 'units', tags: ['high-dose'] },
  'Wacky Worms 300mg': { qty: 12, price: 320, category: 'edibles', subcategory: 'gummies', unit: 'units', tags: [] },
  'Gummy Bears 150mg': { qty: 11, price: 180, category: 'edibles', subcategory: 'gummies', unit: 'units', tags: [] },
  'Cookies 90mg': { qty: 11, price: 120, category: 'edibles', subcategory: 'chocolates', unit: 'units', tags: ['micro-dose'] },
  'Fab Fudge 150mg': { qty: 7, price: 180, category: 'edibles', subcategory: 'chocolates', unit: 'units', tags: [] },
  'Buzz Pops 120mg': { qty: 8, price: 150, category: 'edibles', subcategory: 'lozenges', unit: 'units', tags: [] },
  'Lollipops': { qty: 22, price: 50, category: 'edibles', subcategory: 'lozenges', unit: 'units', tags: ['value'] },
  'Medibles': { qty: 6, price: 220, category: 'edibles', subcategory: 'gummies', unit: 'units', tags: [] },

  // CONCENTRATES - category: concentrates
  'Dope Rope': { qty: 7, price: 300, category: 'concentrates', subcategory: 'wax', unit: 'units', tags: [] },
  'Budder': { qty: 7, price: 300, category: 'concentrates', subcategory: 'wax', unit: 'g', tags: [] },
  'Crumble': { qty: 8, price: 300, category: 'concentrates', subcategory: 'wax', unit: 'g', tags: [] },
  'Hashisha': { qty: 5, price: 150, category: 'concentrates', subcategory: 'hash', unit: 'g', tags: [] },
  'Wax Bad': { qty: 6, price: 180, category: 'concentrates', subcategory: 'wax', unit: 'units', tags: [] },

  // VAPES - category: vapes
  'Disposable Vapes': { qty: 14, price: 500, category: 'vapes', subcategory: 'thc-cartridges', unit: 'units', tags: [] },
  'Disposable Vapes (Rossen)': { qty: 4, price: 600, category: 'vapes', subcategory: 'thc-cartridges', unit: 'units', tags: ['premium'] },
  '1ml Carts': { qty: 9, price: 500, category: 'vapes', subcategory: 'thc-cartridges', unit: 'units', tags: [] },
  'Batteries': { qty: 2, price: 240, category: 'accessories', subcategory: 'cleaning', unit: 'units', tags: ['vape'] },
  'Cell Battery': { qty: 3, price: 600, category: 'accessories', subcategory: 'cleaning', unit: 'units', tags: ['vape'] },

  // OILS & TINCTURES - category: oils
  '20ml THC Oil Drops': { qty: 7, price: 300, category: 'oils', subcategory: 'thc-oil', unit: 'units', tags: [] },
  '420 Magic': { qty: 21, price: 30, category: 'oils', subcategory: 'thc-oil', unit: 'units', tags: ['value'] },

  // CBD PRODUCTS - category: lifestyle-cbd
  'CBD Super Bunny Woman': { qty: 3, price: 200, category: 'lifestyle-cbd', subcategory: 'cbd-edibles', unit: 'units', tags: ['wellness'] },
  'CBD Bunny Men': { qty: 4, price: 220, category: 'lifestyle-cbd', subcategory: 'cbd-edibles', unit: 'units', tags: ['wellness'] },
  'CBD Arouse': { qty: 4, price: 220, category: 'lifestyle-cbd', subcategory: 'cbd-oils', unit: 'units', tags: ['wellness'] },
  'CBD Erect': { qty: 2, price: 220, category: 'lifestyle-cbd', subcategory: 'cbd-oils', unit: 'units', tags: ['wellness'] },
  'Pastilles CBD': { qty: 5, price: 250, category: 'lifestyle-cbd', subcategory: 'cbd-edibles', unit: 'units', tags: [] },
  'Wave Hydration CBD': { qty: 2, price: 200, category: 'lifestyle-cbd', subcategory: 'cbd-beverages', unit: 'units', tags: [] },
  'Fruity CBD Gummies 250mg': { qty: 4, price: 300, category: 'lifestyle-cbd', subcategory: 'cbd-edibles', unit: 'units', tags: [] },

  // TOPICALS - category: topicals
  'Hairfood 250ml': { qty: 4, price: 280, category: 'topicals', subcategory: 'balms', unit: 'units', tags: ['haircare'] },
  'Hairfood 125ml': { qty: 7, price: 170, category: 'topicals', subcategory: 'balms', unit: 'units', tags: ['haircare'] },
  'MJ Cream': { qty: 5, price: 150, category: 'topicals', subcategory: 'creams', unit: 'units', tags: [] },
  'Herbal Pain Balm': { qty: 3, price: 600, category: 'topicals', subcategory: 'balms', unit: 'units', tags: ['pain-relief'] },

  // DRINKS - category: lifestyle-cbd (cbd beverages)
  'Sodaze': { qty: 15, price: 80, category: 'lifestyle-cbd', subcategory: 'cbd-beverages', unit: 'units', tags: ['drink'] },
  'Lucky Club Juice': { qty: 13, price: 100, category: 'lifestyle-cbd', subcategory: 'cbd-beverages', unit: 'units', tags: ['drink'] },
  'Dope Watermelon': { qty: 2, price: 30, category: 'lifestyle-cbd', subcategory: 'cbd-beverages', unit: 'units', tags: ['drink'] },
  'Dope Pineapple': { qty: 1, price: 30, category: 'lifestyle-cbd', subcategory: 'cbd-beverages', unit: 'units', tags: ['drink'] },
  'Dope Grapefruit': { qty: 5, price: 30, category: 'lifestyle-cbd', subcategory: 'cbd-beverages', unit: 'units', tags: ['drink'] },
  'Water': { qty: 31, price: 15, category: 'accessories', subcategory: 'cleaning', unit: 'units', tags: ['drink'] },

  // COMBOS & MISC - category: bundles
  'Bud-Crum Combo': { qty: 7, price: 350, category: 'bundles', unit: 'units', tags: ['combo'] },
  'Dynamic Threesome (3g)': { qty: 89, price: 200, category: 'bundles', unit: 'units', tags: ['combo'] },
  'Singles': { qty: 54, price: 40, category: 'accessories', subcategory: 'papers', unit: 'units', tags: [] },

  // SUPPLEMENTS - category: coffee (using for supplements)
  'Ashwaganda Lifted': { qty: 5, price: 345, category: 'coffee', subcategory: 'specialty-blends', unit: 'units', tags: ['supplement'] },
  'Coffee Latte Lions Chaga': { qty: 1, price: 600, category: 'coffee', subcategory: 'specialty-blends', unit: 'units', tags: ['mushroom', 'supplement'] },
  'Cordyceps': { qty: 0, price: 500, category: 'coffee', subcategory: 'specialty-blends', unit: 'units', tags: ['mushroom', 'supplement'] },

  // JUST BLAZE Pre-Rolls - category: pre-rolls
  'Just Blaze Jedi Diesel': { qty: 1, price: 150, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['premium', 'just-blaze'] },
  'Just Blaze Drips': { qty: 7, price: 170, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['premium', 'just-blaze'] },
  'Just Blaze Blue Dream': { qty: 4, price: 90, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['just-blaze'] },
  'Just Blaze Happy Holidays': { qty: 27, price: 120, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['just-blaze'] },
  'Just Blaze Santas Stash': { qty: 14, price: 120, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['just-blaze'] },
  'Just Blaze Sour Diesel': { qty: 15, price: 90, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['just-blaze'] },
  'Just Blaze Green Cream': { qty: 21, price: 90, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['just-blaze'] },
  'Just Blaze Block Berry': { qty: 12, price: 120, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['just-blaze'] },
  'Just Blaze Sugar High': { qty: 5, price: 120, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['just-blaze'] },
  'Just Blaze Tropical Pineapple': { qty: 33, price: 150, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['premium', 'just-blaze'] },
  'Just Blaze California Black Rose': { qty: 22, price: 150, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['premium', 'just-blaze'] },
  'Just Blaze Charlottes Web': { qty: 2, price: 150, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['premium', 'just-blaze'] },
  'Just Blaze Darth Vader': { qty: 1, price: 150, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['premium', 'just-blaze'] },
  'Just Blaze Blue Cheese': { qty: 27, price: 120, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['just-blaze'] },
  'Just Blaze Purple Rush': { qty: 10, price: 90, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['just-blaze'] },
  'Just Blaze Wednesday Adams': { qty: 21, price: 150, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['premium', 'just-blaze'] },
  'Just Blaze Frosted Apricot': { qty: 2, price: 90, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['just-blaze'] },
  'Just Blaze Cloud Muffin': { qty: 6, price: 90, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['just-blaze'] },
  'Just Blaze Petal Puffs': { qty: 4, price: 150, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['premium', 'just-blaze'] },
  'Just Blaze Blaze Royale': { qty: 2, price: 800, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['ultra-premium', 'just-blaze'] },
  'Just Blaze Haunted Harvest': { qty: 3, price: 150, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['premium', 'just-blaze'] },
  'Just Blaze Space Jam': { qty: 1, price: 150, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['premium', 'just-blaze'] },

  // 5g BAGS - category: flower
  'Block Berry (5g) I.D': { qty: 3, price: 550, category: 'flower', subcategory: 'indica', unit: 'units', tags: ['indoor', '5g-bag'] },
  'Banana Cake (5g) I.D': { qty: 3, price: 550, category: 'flower', subcategory: 'indica', unit: 'units', tags: ['indoor', '5g-bag'] },
  'Super Cheese (5g) I.D': { qty: 3, price: 500, category: 'flower', subcategory: 'indica', unit: 'units', tags: ['indoor', '5g-bag'] },
  'JMO (5g) I.D': { qty: 3, price: 550, category: 'flower', subcategory: 'hybrid', unit: 'units', tags: ['indoor', '5g-bag'] },
  'Candy Dave (5g) I.D': { qty: 4, price: 550, category: 'flower', subcategory: 'hybrid', unit: 'units', tags: ['indoor', '5g-bag'] },
  'White Runtz (5g) G.D': { qty: 4, price: 300, category: 'flower', subcategory: 'hybrid', unit: 'units', tags: ['greendoor', '5g-bag'] },
  'The Church (5g) G.D': { qty: 3, price: 300, category: 'flower', subcategory: 'hybrid', unit: 'units', tags: ['greendoor', '5g-bag'] },

  // OTHER PRE-ROLLS
  'Watermelon Runtz Pre-Roll': { qty: 5, price: 80, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: [] },
  'The Church Pre-Rolls': { qty: 8, price: 80, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: [] },
  'Apple Jax Pre-Roll': { qty: 6, price: 80, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: [] },
  'Premium Blend Pre-Roll': { qty: 11, price: 80, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: [] },
  'Gold Leaf Pre-Roll': { qty: 9, price: 80, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: [] },
  'Honey Moon Pre-Roll': { qty: 23, price: 180, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['infused'] },
  'Perfect Joint (Single)': { qty: 10, price: 10, category: 'pre-rolls', subcategory: 'single-joint', unit: 'units', tags: ['value'] },
  'Perfect Joint (Box)': { qty: 1, price: 130, category: 'pre-rolls', subcategory: '10-pack', unit: 'units', tags: [] },

  // SPECIAL ITEMS
  'Game Changer': { qty: 3, price: 1400, category: 'flower', subcategory: 'hybrid', unit: 'g', tags: ['exotic', 'ultra-premium'] },
  'Bang Bar': { qty: 2, price: 1600, category: 'edibles', subcategory: 'chocolates', unit: 'units', tags: ['ultra-premium', 'high-dose'] },
  'Forbidden Fruit': { qty: 12, price: 80, category: 'edibles', subcategory: 'gummies', unit: 'units', tags: [] },
  'Candy Cartel': { qty: 13, price: 120, category: 'edibles', subcategory: 'gummies', unit: 'units', tags: [] },
  'Rainbow Runtz': { qty: 5, price: 150, category: 'edibles', subcategory: 'gummies', unit: 'units', tags: [] }
};

// Category display names
const categoryNames = {
  'flower-greendoor': 'Greendoor Flower',
  'flower-indoor': 'Indoor Flower',
  'flower-premium': 'Premium Flower',
  'flower-indoor-5g': 'Indoor 5g Bags',
  'flower-greendoor-5g': 'Greendoor 5g Bags',
  'shake': 'Shake & Trim',
  'concentrate': 'Concentrates',
  'pre-roll': 'Pre-Rolls',
  'pre-roll-premium': 'Premium Pre-Rolls (Just Blaze)',
  'edible': 'Edibles',
  'edible-premium': 'Premium Edibles',
  'vape': 'Vapes & Carts',
  'oil': 'Oils & Tinctures',
  'cbd': 'CBD Products',
  'topical': 'Topicals',
  'beverage': 'Beverages',
  'combo': 'Combo Packs',
  'accessory': 'Accessories',
  'supplement': 'Supplements'
};

async function seedDBCStock() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoUri);

    // Get or create DBC branch
    let branch = await Branch.findOne({ name: /jig|ormonde/i });

    if (!branch) {
      branch = await Branch.create({
        name: 'PureGro Ormonde',
        branchCode: 'DBC-ORM',
        address: {
          street: 'Ormonde',
          city: 'Johannesburg',
          province: 'Gauteng',
          postalCode: '2091',
          country: 'South Africa'
        },
        phone: '+27 11 000 0000',
        email: 'ormonde@jig.cleva-ai.co.za',
        isActive: true,
        operatingHours: {
          monday: { open: '09:00', close: '18:00' },
          tuesday: { open: '09:00', close: '18:00' },
          wednesday: { open: '09:00', close: '18:00' },
          thursday: { open: '09:00', close: '18:00' },
          friday: { open: '09:00', close: '18:00' },
          saturday: { open: '09:00', close: '15:00' },
          sunday: { open: null, close: null }
        }
      });
      console.log('Created DBC branch:', branch.name);
    } else {
      console.log('Using existing branch:', branch.name);
    }

    // Seed products and inventory
    let created = 0;
    let updated = 0;
    let inventoryUpdated = 0;

    for (const [name, data] of Object.entries(matlaStock)) {
      // Generate SKU from name
      const sku = name.toUpperCase()
        .replace(/[^A-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 20);

      // Generate slug from name (same as Product model does)
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Find or create product - also check by slug to avoid duplicates
      let product = await Product.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${name}$`, 'i') } },
          { sku: sku },
          { slug: slug }
        ]
      });

      let wasCreated = false;

      if (!product) {
        try {
          product = await Product.create({
            name: name,
            sku: sku,
            description: `${categoryNames[data.category] || data.category} - ${name}`,
            category: data.category,
            subcategory: data.subcategory || undefined,
            price: data.price,
            costPrice: Math.round(data.price * 0.4), // 40% cost estimate
            status: 'active',
            inventory: {
              quantity: data.qty,
              unit: data.unit,
              lowStockThreshold: data.unit === 'g' ? 50 : 5,
              trackQuantity: true,
              allowBackorder: false
            },
            taxRate: 15,
            isSection21: ['flower', 'concentrates', 'edibles', 'oils', 'vapes', 'pre-rolls'].includes(data.category),
            requiresPrescription: false,
            tags: data.tags || []
          });
          wasCreated = true;
          created++;
          console.log(`+ Created: ${name} (${data.qty} ${data.unit})`);
        } catch (createError) {
          if (createError.code === 11000) {
            // Duplicate key - try to find and update
            product = await Product.findOne({ slug: slug });
            if (product) {
              console.log(`! Duplicate found for ${name}, will update existing...`);
            } else {
              console.error(`! Could not resolve duplicate for ${name}`);
              continue;
            }
          } else {
            throw createError;
          }
        }
      }

      // Update existing product (if found from initial query or duplicate resolution)
      if (product && product._id && !wasCreated) {
        product.price = data.price;
        product.category = data.category;
        if (data.subcategory) product.subcategory = data.subcategory;
        product.status = 'active';
        product.tags = data.tags || [];
        product.inventory = {
          quantity: data.qty,
          unit: data.unit,
          lowStockThreshold: data.unit === 'g' ? 50 : 5,
          trackQuantity: true,
          allowBackorder: false
        };
        await product.save();
        updated++;
        console.log(`~ Updated: ${name} (${data.qty} ${data.unit})`);
      }

      if (!product || !product._id) {
        console.log(`! Skipping inventory for ${name} - no product`);
        continue;
      }

      // Update branch inventory
      await BranchInventory.findOneAndUpdate(
        { branchId: branch._id, productId: product._id },
        {
          branchId: branch._id,
          productId: product._id,
          quantity: data.qty,
          reservedQuantity: 0,
          lowStockThreshold: data.unit === 'g' ? 50 : 5,
          reorderPoint: data.unit === 'g' ? 100 : 10,
          lastStockTakeAt: new Date(),
          lastUpdatedBy: null
        },
        { upsert: true, new: true }
      );
      inventoryUpdated++;
    }

    console.log('\n========================================');
    console.log('DBC STOCK SEED COMPLETE');
    console.log('========================================');
    console.log(`Branch: ${branch.name} (${branch.branchCode})`);
    console.log(`Products Created: ${created}`);
    console.log(`Products Updated: ${updated}`);
    console.log(`Inventory Records: ${inventoryUpdated}`);
    console.log('========================================\n');

    // Summary by category
    const categoryCounts = {};
    for (const data of Object.values(matlaStock)) {
      categoryCounts[data.category] = (categoryCounts[data.category] || 0) + 1;
    }

    console.log('Products by Category:');
    for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${categoryNames[cat] || cat}: ${count}`);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

// Run the seed
seedDBCStock();
