#!/usr/bin/env node
/**
 * Seed Ormonde Branch — REAL DATA from Meri Jane Ormonde Stock Take (30 Jan 2026)
 * 135 products with actual SOH, prices, and product codes from Odyssey POS
 * Run: node backend/scripts/seed-ormonde.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../modules/database/models/Branch');
const Product = require('../modules/database/models/Product');
const BranchInventory = require('../modules/database/models/BranchInventory');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';

// ─── ORMONDE BRANCH ───────────────────────────────────────────
const ormondeBranch = {
  branchCode: 'ORM',
  name: 'Ormonde',
  type: 'retail',
  isHeadquarters: false,
  address: {
    street: 'Ormonde Shopping Centre',
    suburb: 'Ormonde',
    city: 'Johannesburg',
    province: 'Gauteng',
    postalCode: '2091',
    country: 'South Africa'
  },
  phone: '+27 11 000 0000',
  email: 'ormonde@cleva-ai.co.za',
  timezone: 'Africa/Johannesburg',
  operatingHours: [
    { day: 'Monday', open: '09:00', close: '18:00' },
    { day: 'Tuesday', open: '09:00', close: '18:00' },
    { day: 'Wednesday', open: '09:00', close: '18:00' },
    { day: 'Thursday', open: '09:00', close: '18:00' },
    { day: 'Friday', open: '09:00', close: '18:00' },
    { day: 'Saturday', open: '09:00', close: '14:00' },
    { day: 'Sunday', closed: true }
  ],
  tills: [
    { tillNumber: 'ORM-001', name: 'Till 1', isActive: true, speedPointProvider: 'manual' },
    { tillNumber: 'ORM-002', name: 'Till 2', isActive: true, speedPointProvider: 'manual' }
  ],
  hasLifestyleTrack: true,
  hasMedicalTrack: true,
  isActive: true
};

// ─── ORMONDE STAFF ────────────────────────────────────────────
// Staff users are created separately — seed script only handles products & inventory
const ormondeStaff = [];

// ─── REAL PRODUCTS: Meri Jane Ormonde Stock Take 30 Jan 2026 ──
// Source: Odyssey POS "Stocktake reprint" — 135 items
// SOH = Stock On Hand (final count)
// Price = Selling price from Stock Take List 29 Jan 2026
//
// Categories: flower, edibles, concentrates, vapes, cbd, topicals, drinks, accessories
// Tags: growMethod (indoor/greendoor), productType (loose/pre-pack/pre-roll)

const ormondeProducts = [

  // ════════════════════════════════════════════════════════════
  // FLOWER — LOOSE (sold by gram, decimal quantities)
  // ════════════════════════════════════════════════════════════
  { sku: '972', name: 'Strawberry Lemonade (SPECIAL)', category: 'flower', price: 40, quantity: 279.58, tags: ['greendoor'], productType: 'loose' },
  { sku: '870', name: 'Divine Storm', category: 'flower', price: 70, quantity: 100.32, tags: [], productType: 'loose' },
  { sku: '86', name: 'Pitbull', category: 'flower', price: 100, quantity: 111.39, tags: [], productType: 'loose' },
  { sku: '775', name: 'Super Cheese', category: 'flower', price: 50, quantity: 67.19, tags: [], productType: 'loose' },
  { sku: '720', name: 'K-Snow', category: 'flower', price: 80, quantity: 184.36, tags: ['indoor'], productType: 'loose' },
  { sku: '719', name: 'Zoap', category: 'flower', price: 80, quantity: 150, tags: ['indoor'], productType: 'loose' },
  { sku: '711', name: 'Ice Queen', category: 'flower', price: 120, quantity: 99, tags: [], productType: 'loose' },
  { sku: '710', name: 'Face On Fire', category: 'flower', price: 120, quantity: 83.2, tags: [], productType: 'loose' },
  { sku: '709', name: 'Blue Pava', category: 'flower', price: 150, quantity: 92.8, tags: [], productType: 'loose' },
  { sku: '708', name: 'Frozen Peach', category: 'flower', price: 150, quantity: 96.52, tags: [], productType: 'loose' },
  { sku: '7', name: 'Alien Cookie', category: 'flower', price: 60, quantity: 103.36, tags: [], productType: 'loose' },
  { sku: '687', name: 'Kings Truck', category: 'flower', price: 100, quantity: 107.8, tags: [], productType: 'loose' },
  { sku: '684', name: 'Gorilla Zkittles', category: 'flower', price: 60, quantity: 125.55, tags: [], productType: 'loose' },
  { sku: '683', name: 'PINK RUNTZ', category: 'flower', price: 80, quantity: 116.2, tags: [], productType: 'loose' },
  { sku: '682', name: 'RAINBOW ROYALE (I.D)', category: 'flower', price: 150, quantity: 37.9, tags: ['indoor'], productType: 'loose' },
  { sku: '681', name: 'Rainbow Sherbit (I.D)', category: 'flower', price: 150, quantity: 67, tags: ['indoor'], productType: 'loose' },
  { sku: '680', name: 'Beach Wedding (g.d)', category: 'flower', price: 60, quantity: 199.87, tags: ['greendoor'], productType: 'loose' },
  { sku: '672', name: 'Don Perinon', category: 'flower', price: 120, quantity: 37.51, tags: [], productType: 'loose' },
  { sku: '663', name: 'Blue Zucci', category: 'flower', price: 150, quantity: 93, tags: [], productType: 'loose' },
  { sku: '655', name: 'Cheese', category: 'flower', price: 60, quantity: 114.98, tags: ['greendoor'], productType: 'loose' },
  { sku: '646', name: 'Monster Zkittles', category: 'flower', price: 150, quantity: 50, tags: [], productType: 'loose' },
  { sku: '644', name: 'Bakers', category: 'flower', price: 120, quantity: 157.26, tags: ['indoor'], productType: 'loose' },
  { sku: '611', name: 'Jungle Diamond', category: 'flower', price: 70, quantity: 253.18, tags: ['greendoor'], productType: 'loose' },
  { sku: '572', name: 'PURPLE PEANUT BUTTER', category: 'flower', price: 100, quantity: 55.7, tags: ['indoor'], productType: 'loose' },
  { sku: '357', name: 'Block Berry', category: 'flower', price: 120, quantity: 87.26, tags: [], productType: 'loose' },
  { sku: '318', name: 'Black Cherry Punch', category: 'flower', price: 70, quantity: 178.79, tags: ['greendoor'], productType: 'loose' },
  { sku: '315', name: 'Gary Payton', category: 'flower', price: 70, quantity: 255, tags: ['greendoor'], productType: 'loose' },
  { sku: '429', name: 'Durban Sky', category: 'flower', price: 40, quantity: 16, tags: [], productType: 'loose' },
  { sku: '1002', name: 'Ice Cream Cake (i.d)', category: 'flower', price: 100, quantity: 106.57, tags: ['indoor'], productType: 'loose' },
  { sku: '490', name: 'Rainbow Runtz', category: 'flower', price: 150, quantity: 5, tags: [], productType: 'loose' },
  { sku: '538', name: 'Pink Cookies', category: 'flower', price: 150, quantity: 0, tags: [], productType: 'loose' },

  // ════════════════════════════════════════════════════════════
  // FLOWER — PRE-PACKS (5g / 3g bags, sold by unit)
  // ════════════════════════════════════════════════════════════
  { sku: '660', name: 'Block Berry (5g) i.d', category: 'flower', price: 550, quantity: 3, tags: ['indoor', 'pre-pack'], productType: 'pre-pack' },
  { sku: '659', name: 'White Runtz (5g) g.d', category: 'flower', price: 300, quantity: 4, tags: ['greendoor', 'pre-pack'], productType: 'pre-pack' },
  { sku: '658', name: 'The Church (5g) g.d', category: 'flower', price: 300, quantity: 3, tags: ['greendoor', 'pre-pack'], productType: 'pre-pack' },
  { sku: '657', name: 'Gelato (5g) g.d', category: 'flower', price: 300, quantity: 0, tags: ['greendoor', 'pre-pack'], productType: 'pre-pack' },
  { sku: '485', name: 'Super Cheese (5g) i.d', category: 'flower', price: 500, quantity: 3, tags: ['indoor', 'pre-pack'], productType: 'pre-pack' },
  { sku: '612', name: 'Banana Cake (5g) I.D', category: 'flower', price: 550, quantity: 3, tags: ['indoor', 'pre-pack'], productType: 'pre-pack' },
  { sku: '238', name: 'JMO (5g) i.d', category: 'flower', price: 550, quantity: 3, tags: ['indoor', 'pre-pack'], productType: 'pre-pack' },
  { sku: '164', name: 'Candy Dave (5g) I.D', category: 'flower', price: 550, quantity: 4, tags: ['indoor', 'pre-pack'], productType: 'pre-pack' },
  { sku: '615', name: 'Dynamic Threesome (3g)', category: 'flower', price: 200, quantity: 89, tags: ['pre-pack'], productType: 'pre-pack' },

  // ════════════════════════════════════════════════════════════
  // FLOWER — PRE-ROLLS (house brand, sold by unit)
  // ════════════════════════════════════════════════════════════
  { sku: '966', name: 'Moon Stick (G.D)', category: 'flower', price: 80, quantity: 82, tags: ['greendoor', 'pre-roll'], productType: 'pre-roll' },
  { sku: '85', name: 'Moon Stick (I.D)', category: 'flower', price: 100, quantity: 75, tags: ['indoor', 'pre-roll'], productType: 'pre-roll' },
  { sku: '81', name: 'Honey-comb Pre-Roll', category: 'flower', price: 100, quantity: 68, tags: ['pre-roll'], productType: 'pre-roll' },
  { sku: '71', name: 'MJ Roll', category: 'flower', price: 80, quantity: 45, tags: ['pre-roll'], productType: 'pre-roll' },
  { sku: '83', name: 'Gold Roll', category: 'flower', price: 50, quantity: 299, tags: ['pre-roll'], productType: 'pre-roll' },
  { sku: '695', name: 'Watermelon runtz Pre-Roll', category: 'flower', price: 80, quantity: 5, tags: ['pre-roll'], productType: 'pre-roll' },
  { sku: '694', name: 'The Church Pre-Rolls', category: 'flower', price: 80, quantity: 8, tags: ['pre-roll'], productType: 'pre-roll' },
  { sku: '55', name: 'Apple Jax Pre-Roll', category: 'flower', price: 80, quantity: 6, tags: ['pre-roll'], productType: 'pre-roll' },
  { sku: '53', name: 'Premium Blend Pre-Roll', category: 'flower', price: 80, quantity: 11, tags: ['pre-roll'], productType: 'pre-roll' },
  { sku: '495', name: 'Gold Leaf Pre-Roll', category: 'flower', price: 80, quantity: 9, tags: ['pre-roll'], productType: 'pre-roll' },
  { sku: '198', name: 'Honey Moon Pre-Roll', category: 'flower', price: 180, quantity: 23, tags: ['pre-roll'], productType: 'pre-roll' },
  { sku: '223', name: 'perfect joint (sng)', category: 'flower', price: 10, quantity: 10, tags: ['pre-roll'], productType: 'pre-roll' },
  { sku: '222', name: 'perfect joint (box)', category: 'flower', price: 130, quantity: 1, tags: ['pre-roll'], productType: 'pre-roll' },
  { sku: '380', name: 'Singles', category: 'flower', price: 40, quantity: 54, tags: ['pre-roll'], productType: 'pre-roll' },

  // ════════════════════════════════════════════════════════════
  // FLOWER — JUST BLAZE PRE-ROLLS (brand partner, sold by unit)
  // ════════════════════════════════════════════════════════════
  { sku: '968', name: 'Just Blaze Jedi Diesel', category: 'flower', price: 150, quantity: 1, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '852', name: 'Just Blaze Drips', category: 'flower', price: 170, quantity: 7, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '805', name: 'Just Blaze Blue Dream', category: 'flower', price: 90, quantity: 4, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '718', name: 'Just Blaze Happy Holidays', category: 'flower', price: 120, quantity: 27, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '717', name: 'Just Blaze Santas Stash', category: 'flower', price: 120, quantity: 14, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '693', name: 'Just Blaze Sour Diesel', category: 'flower', price: 90, quantity: 15, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '692', name: 'Just Blaze Green Cream', category: 'flower', price: 90, quantity: 21, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '691', name: 'Just Blaze Block Berry', category: 'flower', price: 120, quantity: 12, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '690', name: 'Just Blaze Sugar High', category: 'flower', price: 120, quantity: 5, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '689', name: 'Just Blaze Tropical Pineapple', category: 'flower', price: 150, quantity: 33, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '688', name: 'Just Blaze California Black Rose', category: 'flower', price: 150, quantity: 22, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '676', name: 'Just Blaze Charlottes Web', category: 'flower', price: 150, quantity: 2, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '674', name: 'Just Blaze Darth Vader', category: 'flower', price: 150, quantity: 1, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '671', name: 'Just Blaze Blue Cheese', category: 'flower', price: 120, quantity: 27, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '664', name: 'Just Blaze Purple Rush', category: 'flower', price: 90, quantity: 10, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '662', name: 'Just Blaze Gelato', category: 'flower', price: 90, quantity: 0, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '645', name: 'Just Blaze Haunted Harvest', category: 'flower', price: 150, quantity: 3, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '634', name: 'Just Blaze Plat Gorilla', category: 'flower', price: 90, quantity: 0, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '614', name: 'Just Blaze Blaze Royale', category: 'flower', price: 800, quantity: 2, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '598', name: 'Just Blaze Frosted Apricot', category: 'flower', price: 90, quantity: 2, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '597', name: 'Just Blaze Cloud Muffin', category: 'flower', price: 90, quantity: 6, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '578', name: 'Just Blaze Petal Puffs', category: 'flower', price: 150, quantity: 4, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '541', name: 'Just Blaze The Baddie', category: 'flower', price: 150, quantity: 0, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '451', name: 'Just Blaze Wednesday Adams', category: 'flower', price: 150, quantity: 21, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '24', name: 'Just Blaze Sherbit', category: 'flower', price: 90, quantity: 0, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '234', name: 'Just Blaze Space Jam', category: 'flower', price: 150, quantity: 1, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },
  { sku: '1', name: 'Just Blaze Banana Java', category: 'flower', price: 120, quantity: 0, tags: ['pre-roll', 'just-blaze'], productType: 'pre-roll' },

  // ════════════════════════════════════════════════════════════
  // EDIBLES (sold by unit)
  // ════════════════════════════════════════════════════════════
  { sku: '99', name: 'Toffees 150mg', category: 'edibles', price: 180, quantity: 10, tags: [], productType: 'unit' },
  { sku: '98', name: 'Fruit Pastelles 150mg', category: 'edibles', price: 180, quantity: 4, tags: [], productType: 'unit' },
  { sku: '97', name: 'Rainbow Strips 200mg', category: 'edibles', price: 240, quantity: 12, tags: [], productType: 'unit' },
  { sku: '96', name: 'Red Ropes (Red Vines) 200mg', category: 'edibles', price: 240, quantity: 8, tags: [], productType: 'unit' },
  { sku: '94', name: 'Loaded Leaf 200mg', category: 'edibles', price: 240, quantity: 12, tags: [], productType: 'unit' },
  { sku: '93', name: 'Blazed Blocks 150mg', category: 'edibles', price: 180, quantity: 8, tags: [], productType: 'unit' },
  { sku: '92', name: 'OG Gummies 330mg', category: 'edibles', price: 350, quantity: 13, tags: [], productType: 'unit' },
  { sku: '912', name: 'Dope Rope', category: 'edibles', price: 300, quantity: 7, tags: [], productType: 'unit' },
  { sku: '188', name: 'OG Gummies 150mg', category: 'edibles', price: 180, quantity: 21, tags: [], productType: 'unit' },
  { sku: '110', name: 'Wacky Worms 300mg', category: 'edibles', price: 320, quantity: 12, tags: [], productType: 'unit' },
  { sku: '109', name: 'Gummies Bears 150mg', category: 'edibles', price: 180, quantity: 11, tags: [], productType: 'unit' },
  { sku: '104', name: 'Cookies 90mg', category: 'edibles', price: 120, quantity: 11, tags: [], productType: 'unit' },
  { sku: '102', name: 'Fab Fudge 150mg', category: 'edibles', price: 180, quantity: 7, tags: [], productType: 'unit' },
  { sku: '100', name: 'Buzz Pops 120mg', category: 'edibles', price: 150, quantity: 8, tags: [], productType: 'unit' },
  { sku: '573', name: 'Heart Stopper 200mg', category: 'edibles', price: 200, quantity: 7, tags: [], productType: 'unit' },
  { sku: '331', name: 'Heart Stopper 400mg', category: 'edibles', price: 400, quantity: 13, tags: [], productType: 'unit' },
  { sku: '381', name: 'Lollipops', category: 'edibles', price: 50, quantity: 22, tags: [], productType: 'unit' },
  { sku: '455', name: '420 Magic', category: 'edibles', price: 30, quantity: 21, tags: [], productType: 'unit' },
  { sku: '594', name: 'Candy Cartel', category: 'edibles', price: 120, quantity: 13, tags: [], productType: 'unit' },
  { sku: '595', name: 'Forbidden Fruit', category: 'edibles', price: 80, quantity: 12, tags: [], productType: 'unit' },
  { sku: '246', name: 'Medibles', category: 'edibles', price: 220, quantity: 6, tags: [], productType: 'unit' },
  { sku: '489', name: 'Bang Bar', category: 'edibles', price: 1600, quantity: 2, tags: [], productType: 'unit' },
  { sku: '608', name: 'Game Changer', category: 'edibles', price: 1400, quantity: 3, tags: [], productType: 'unit' },

  // ════════════════════════════════════════════════════════════
  // CONCENTRATES (sold by unit)
  // ════════════════════════════════════════════════════════════
  { sku: '858', name: 'Hashisha', category: 'concentrates', price: 150, quantity: 5, tags: [], productType: 'unit' },
  { sku: '836', name: 'Budder', category: 'concentrates', price: 300, quantity: 7, tags: [], productType: 'unit' },
  { sku: '875', name: 'Bud-Crum Combo', category: 'concentrates', price: 350, quantity: 7, tags: [], productType: 'unit' },
  { sku: '189', name: 'Crumble', category: 'concentrates', price: 300, quantity: 8, tags: [], productType: 'unit' },
  { sku: '313', name: 'Wax Bad', category: 'concentrates', price: 180, quantity: 6, tags: [], productType: 'unit' },

  // ════════════════════════════════════════════════════════════
  // VAPES & CARTRIDGES (sold by unit)
  // ════════════════════════════════════════════════════════════
  { sku: '216', name: 'Disposable Vapes (Rossen)', category: 'vapes', price: 600, quantity: 4, tags: [], productType: 'unit' },
  { sku: '118', name: 'Disposable Vapes', category: 'vapes', price: 500, quantity: 14, tags: [], productType: 'unit' },
  { sku: '112', name: '1ml Carts', category: 'vapes', price: 500, quantity: 9, tags: [], productType: 'unit' },
  { sku: '113', name: 'Batteries', category: 'vapes', price: 240, quantity: 2, tags: [], productType: 'unit' },
  { sku: '343', name: 'Cell Battery', category: 'vapes', price: 600, quantity: 3, tags: [], productType: 'unit' },

  // ════════════════════════════════════════════════════════════
  // CBD / WELLNESS (sold by unit)
  // ════════════════════════════════════════════════════════════
  { sku: '466', name: 'CBD Super Bunny Woman', category: 'lifestyle-cbd', price: 200, quantity: 3, tags: ['cbd'], productType: 'unit' },
  { sku: '459', name: 'CBD Bunny Men', category: 'lifestyle-cbd', price: 220, quantity: 4, tags: ['cbd'], productType: 'unit' },
  { sku: '458', name: 'CBD Arouse', category: 'lifestyle-cbd', price: 220, quantity: 4, tags: ['cbd'], productType: 'unit' },
  { sku: '457', name: 'CBD Erect', category: 'lifestyle-cbd', price: 220, quantity: 2, tags: ['cbd'], productType: 'unit' },
  { sku: '437', name: 'Pastilles CBD', category: 'lifestyle-cbd', price: 250, quantity: 5, tags: ['cbd'], productType: 'unit' },
  { sku: '436', name: 'Wave Hydration Drink CBD', category: 'lifestyle-cbd', price: 200, quantity: 2, tags: ['cbd'], productType: 'unit' },
  { sku: '349', name: 'Fruity CBD Gummies 250mg', category: 'lifestyle-cbd', price: 300, quantity: 4, tags: ['cbd'], productType: 'unit' },
  { sku: '716', name: 'Cordyceps', category: 'lifestyle-cbd', price: 500, quantity: 0, tags: ['supplement'], productType: 'unit' },
  { sku: '150', name: 'Ashwaganda Lifted', category: 'lifestyle-cbd', price: 345, quantity: 5, tags: ['supplement'], productType: 'unit' },
  { sku: '491', name: 'Coffee Latte Lions Chaga', category: 'lifestyle-cbd', price: 600, quantity: 1, tags: ['supplement'], productType: 'unit' },

  // ════════════════════════════════════════════════════════════
  // OILS & TOPICALS (sold by unit)
  // ════════════════════════════════════════════════════════════
  { sku: '134', name: '20ml THC Oil Drops', category: 'topicals', price: 300, quantity: 7, tags: ['oil'], productType: 'unit' },
  { sku: '165', name: 'MJ Cream', category: 'topicals', price: 150, quantity: 5, tags: ['cream'], productType: 'unit' },
  { sku: '822', name: 'Hairfood 250ml', category: 'topicals', price: 280, quantity: 4, tags: ['haircare'], productType: 'unit' },
  { sku: '821', name: 'Hairfood 125ml', category: 'topicals', price: 170, quantity: 7, tags: ['haircare'], productType: 'unit' },
  { sku: '480', name: 'Herbal Pain Balm', category: 'topicals', price: 600, quantity: 3, tags: ['balm'], productType: 'unit' },

  // ════════════════════════════════════════════════════════════
  // DRINKS (sold by unit)
  // ════════════════════════════════════════════════════════════
  { sku: '303', name: 'Dope Watermelon', category: 'lifestyle-cbd', price: 30, quantity: 2, tags: ['drink'], productType: 'unit' },
  { sku: '302', name: 'Dope Pineapple', category: 'lifestyle-cbd', price: 30, quantity: 1, tags: ['drink'], productType: 'unit' },
  { sku: '301', name: 'Dope Grapefruit', category: 'lifestyle-cbd', price: 30, quantity: 5, tags: ['drink'], productType: 'unit' },
  { sku: '330', name: 'Lucky Club Juice', category: 'lifestyle-cbd', price: 100, quantity: 13, tags: ['drink'], productType: 'unit' },
  { sku: '304', name: 'Water', category: 'lifestyle-cbd', price: 15, quantity: 31, tags: ['drink'], productType: 'unit' },
  { sku: '411', name: 'Sodaze', category: 'lifestyle-cbd', price: 80, quantity: 15, tags: ['cbd', 'drink'], productType: 'unit' },
];

// ─── SEED FUNCTION ────────────────────────────────────────────
async function seedOrmonde() {
  console.log('================================================');
  console.log('  SEEDING ORMONDE — REAL MERI JANE DATA');
  console.log('  135 products from Stock Take 30 Jan 2026');
  console.log('================================================\n');

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected:', MONGODB_URI);

    // 1. Create/Update Branch
    console.log('\n1. Creating Ormonde Branch...');
    let branch = await Branch.findOne({ branchCode: 'ORM' });
    if (branch) {
      console.log('   Branch exists, updating...');
      Object.assign(branch, ormondeBranch);
      await branch.save();
    } else {
      branch = await Branch.create(ormondeBranch);
      console.log('   Branch created!');
    }
    console.log(`   Branch ID: ${branch._id}`);

    // 2. Staff — managed separately, this script ONLY seeds products & inventory
    console.log('\n2. Staff: SKIPPED (users are managed separately, not by this script)');

    // 3. Create Products + BranchInventory
    console.log('\n3. Seeding Products & Inventory...');
    let created = 0, updated = 0;

    for (const p of ormondeProducts) {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const productFields = {
        name: p.name,
        sku: p.sku,
        category: p.category,
        price: p.price,
        tags: p.tags || [],
        description: `${p.name} — ${p.category}`,
        status: 'active',
        isPublished: true,
        inventory: {
          quantity: p.quantity,
          reserved: 0,
          lowStockThreshold: 5,
          trackQuantity: true,
          allowBackorder: false
        }
      };

      let product = await Product.findOne({ $or: [{ sku: p.sku }, { slug }] });
      if (product) {
        Object.assign(product, productFields);
        await product.save();
        updated++;
      } else {
        product = await Product.create(productFields);
        created++;
      }

      // BranchInventory — links this product to Ormonde with SOH quantity
      await BranchInventory.findOneAndUpdate(
        { branchId: branch._id, productId: product._id },
        {
          branchId: branch._id,
          productId: product._id,
          quantity: p.quantity,
          reserved: 0,
          minStock: 3,
          maxStock: 500,
          reorderPoint: 5
        },
        { upsert: true, new: true }
      );
    }

    console.log(`   Created: ${created} products`);
    console.log(`   Updated: ${updated} products`);
    console.log(`   Total:   ${ormondeProducts.length} products`);
    console.log(`   BranchInventory: ${ormondeProducts.length} records for Ormonde`);

    // Category breakdown
    const cats = {};
    ormondeProducts.forEach(p => {
      const key = p.productType === 'loose' ? 'flower (loose)' :
                  p.productType === 'pre-pack' ? 'flower (pre-pack)' :
                  p.productType === 'pre-roll' && p.tags.includes('just-blaze') ? 'flower (Just Blaze)' :
                  p.productType === 'pre-roll' ? 'flower (pre-roll)' :
                  p.category;
      cats[key] = (cats[key] || 0) + 1;
    });

    console.log('\n   Category Breakdown:');
    Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`     ${cat}: ${count}`);
    });

    // Total stock value
    const totalValue = ormondeProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    console.log(`\n   Total Stock Value: R${totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);

    console.log('\n================================================');
    console.log('  SEEDING COMPLETE!');
    console.log('  Products & inventory only — no users touched');
    console.log('================================================');

  } catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  }
}

seedOrmonde();
