// seed-production-products.js — Seed local DB with all 175 products from production
// Run: node seed-production-products.js
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./backend/modules/database/models/Product');

const products = [
  // === ACCESSORIES (6) ===
  { name: 'Blades', sku: 'BLADES', price: 40, category: 'accessories', track: 'lifestyle' },
  { name: 'Glass Pipe - Spoon Style', sku: 'ACC-PIPE-SPOON', price: 299, category: 'accessories', track: 'lifestyle' },
  { name: 'Glass Storage Jar - 500ml', sku: 'ACC-JAR-500ML', price: 149, category: 'accessories', track: 'lifestyle' },
  { name: 'Organic Hemp Papers - King Size', sku: 'ACC-PAPERS-KING', price: 49, category: 'accessories', track: 'lifestyle' },
  { name: 'Premium Grinder - 4 Piece', sku: 'ACC-GRINDER-4PC', price: 199, category: 'accessories', track: 'lifestyle' },
  { name: 'Rolling Tray - Metal', sku: 'ACC-TRAY-METAL', price: 129, category: 'accessories', track: 'lifestyle' },

  // === CONCENTRATES (6) ===
  { name: 'Bud-Crum Combo', sku: '875', price: 350, category: 'concentrates', track: 'lifestyle' },
  { name: 'Budder', sku: '836', price: 300, category: 'concentrates', track: 'lifestyle' },
  { name: 'Crumble', sku: '189', price: 300, category: 'concentrates', track: 'lifestyle' },
  { name: 'Hashisha', sku: '858', price: 150, category: 'concentrates', track: 'lifestyle' },
  { name: 'Kief', sku: 'KIEF', price: 100, category: 'concentrates', track: 'lifestyle' },
  { name: 'Wax Bad', sku: '313', price: 180, category: 'concentrates', track: 'lifestyle' },

  // === EDIBLES (25) ===
  { name: '420 Magic', sku: '455', price: 30, category: 'edibles', track: 'lifestyle' },
  { name: 'Bang Bar', sku: '489', price: 1600, category: 'edibles', track: 'lifestyle' },
  { name: 'Blazed Blocks 150mg', sku: '93', price: 180, category: 'edibles', track: 'lifestyle' },
  { name: 'Buzz Pops 120mg', sku: '100', price: 150, category: 'edibles', track: 'lifestyle' },
  { name: 'Candy Cartel', sku: '594', price: 120, category: 'edibles', track: 'lifestyle' },
  { name: 'Cookies 90mg', sku: '104', price: 120, category: 'edibles', track: 'lifestyle' },
  { name: 'Dope Rope', sku: '912', price: 300, category: 'edibles', track: 'lifestyle' },
  { name: 'Fab Fudge 150mg', sku: '102', price: 180, category: 'edibles', track: 'lifestyle' },
  { name: 'Forbidden Fruit', sku: '595', price: 80, category: 'edibles', track: 'lifestyle' },
  { name: 'Fruit Pastelles 150mg', sku: '98', price: 180, category: 'edibles', track: 'lifestyle' },
  { name: 'Game Changer', sku: '608', price: 1400, category: 'edibles', track: 'lifestyle' },
  { name: 'Gummies Bears 150mg', sku: '109', price: 180, category: 'edibles', track: 'lifestyle' },
  { name: 'Gummy Bears 150mg', sku: 'GUMMY-BEARS-150MG', price: 180, category: 'edibles', track: 'lifestyle' },
  { name: 'Heart Stopper 200mg', sku: '573', price: 200, category: 'edibles', track: 'lifestyle' },
  { name: 'Heart Stopper 400mg', sku: '331', price: 400, category: 'edibles', track: 'lifestyle' },
  { name: 'Loaded Leaf 200mg', sku: '94', price: 240, category: 'edibles', track: 'lifestyle' },
  { name: 'Lollipops', sku: '381', price: 50, category: 'edibles', track: 'lifestyle' },
  { name: 'Medibles', sku: '246', price: 220, category: 'edibles', track: 'lifestyle' },
  { name: 'OG Gummies 150mg', sku: '188', price: 180, category: 'edibles', track: 'lifestyle' },
  { name: 'OG Gummies 330mg', sku: '92', price: 350, category: 'edibles', track: 'lifestyle' },
  { name: 'Rainbow Strips 200mg', sku: '97', price: 240, category: 'edibles', track: 'lifestyle' },
  { name: 'Red Ropes (Red Vines) 200mg', sku: '96', price: 240, category: 'edibles', track: 'lifestyle' },
  { name: 'Red Ropes 200mg', sku: 'RED-ROPES-200MG', price: 240, category: 'edibles', track: 'lifestyle' },
  { name: 'Toffees 150mg', sku: '99', price: 180, category: 'edibles', track: 'lifestyle' },
  { name: 'Wacky Worms 300mg', sku: '110', price: 320, category: 'edibles', track: 'lifestyle' },

  // === FLOWER (110) ===
  { name: 'Alien Cookie', sku: '7', price: 60, category: 'flower', track: 'lifestyle' },
  { name: 'Alien Cookies', sku: 'GD-ALIEN-COOKIES', price: 60, category: 'flower', track: 'lifestyle' },
  { name: 'Apple Jax Pre-Roll', sku: '55', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'Bakers', sku: '644', price: 120, category: 'flower', track: 'lifestyle' },
  { name: 'Banana Cake (5g) I.D', sku: '612', price: 550, category: 'flower', track: 'lifestyle' },
  { name: 'Beach Wedding', sku: 'GD-BEACH-WEDDING', price: 60, category: 'flower', track: 'lifestyle' },
  { name: 'Beach Wedding (g.d)', sku: '680', price: 60, category: 'flower', track: 'lifestyle' },
  { name: 'Black Cherry Punch', sku: '318', price: 70, category: 'flower', track: 'lifestyle' },
  { name: 'Blackberry', sku: 'DBC-IND-BLACKBERRY', price: 100, category: 'flower', track: 'lifestyle' },
  { name: 'Block Berry', sku: '357', price: 120, category: 'flower', track: 'lifestyle' },
  { name: 'Block Berry (5g) i.d', sku: '660', price: 550, category: 'flower', track: 'lifestyle' },
  { name: 'Blu Zuchi', sku: 'IN-BLU-ZUCHI', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Blue Pava', sku: '709', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Blue Zucci', sku: '663', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Candy Dave (5g) I.D', sku: '164', price: 550, category: 'flower', track: 'lifestyle' },
  { name: 'Cheese', sku: '655', price: 60, category: 'flower', track: 'lifestyle' },
  { name: "Dante's Inferno", sku: 'DANTE-S-INFERNO', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'Divine Storm', sku: '870', price: 70, category: 'flower', track: 'lifestyle' },
  { name: 'Don Perinon', sku: '672', price: 120, category: 'flower', track: 'lifestyle' },
  { name: 'Durban Sky', sku: '429', price: 40, category: 'flower', track: 'lifestyle' },
  { name: 'Dynamic Threesome (3g)', sku: '615', price: 200, category: 'flower', track: 'lifestyle' },
  { name: 'Excel Cheese', sku: 'EXCEL-CHEESE', price: 60, category: 'flower', track: 'lifestyle' },
  { name: 'Face On Fire', sku: '710', price: 120, category: 'flower', track: 'lifestyle' },
  { name: 'Frozen Peach', sku: '708', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Gary Payton', sku: '315', price: 70, category: 'flower', track: 'lifestyle' },
  { name: 'Gelato (5g) g.d', sku: '657', price: 300, category: 'flower', track: 'lifestyle' },
  { name: 'Gold Leaf Pre-Roll', sku: '495', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'Gold Roll', sku: '83', price: 50, category: 'flower', track: 'lifestyle' },
  { name: 'Gold Roll Flower Mix', sku: 'GOLD-ROLL-FLOWER-MIX', price: 25, category: 'flower', track: 'lifestyle' },
  { name: 'Gold Roll Krush', sku: 'GOLD-ROLL-KRUSH', price: 25, category: 'flower', track: 'lifestyle' },
  { name: 'Gold Roll Mix', sku: 'GOLD-ROLL-MIX', price: 25, category: 'flower', track: 'lifestyle' },
  { name: 'Gold Rolls', sku: 'GOLD-ROLLS', price: 50, category: 'flower', track: 'lifestyle' },
  { name: 'Gorilla Zkittles', sku: '684', price: 60, category: 'flower', track: 'lifestyle' },
  { name: 'Honey Moon Pre-Roll', sku: '198', price: 180, category: 'flower', track: 'lifestyle' },
  { name: 'Honey-comb Pre-Roll', sku: '81', price: 100, category: 'flower', track: 'lifestyle' },
  { name: 'Honeycomb Pre-Roll', sku: 'HONEYCOMB-PRE-ROLL', price: 100, category: 'flower', track: 'lifestyle' },
  { name: 'Ice Cream Cake', sku: 'IN-ICE-CREAM-CAKE', price: 100, category: 'flower', track: 'lifestyle' },
  { name: 'Ice Cream Cake (i.d)', sku: '1002', price: 100, category: 'flower', track: 'lifestyle' },
  { name: 'Ice Queen', sku: '711', price: 120, category: 'flower', track: 'lifestyle' },
  { name: 'JMO (5g) i.d', sku: '238', price: 550, category: 'flower', track: 'lifestyle' },
  { name: 'Jell-O', sku: 'JELL-O', price: 60, category: 'flower', track: 'lifestyle' },
  { name: 'Jungle Diamond', sku: '611', price: 70, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Banana Java', sku: '1', price: 120, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Blaze Royale', sku: '614', price: 800, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Block Berry', sku: '691', price: 120, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Blue Cheese', sku: '671', price: 120, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Blue Dream', sku: '805', price: 90, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze California Black Rose', sku: '688', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Charlottes Web', sku: '676', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Cloud Muffin', sku: '597', price: 90, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Darth Vader', sku: '674', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Drips', sku: '852', price: 170, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Frosted Apricot', sku: '598', price: 90, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Gelato', sku: '662', price: 90, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Green Cream', sku: '692', price: 90, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Happy Holidays', sku: '718', price: 120, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Haunted Harvest', sku: '645', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Jedi Diesel', sku: '968', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Petal Puffs', sku: '578', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Plat Gorilla', sku: '634', price: 90, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Purple Rush', sku: '664', price: 90, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Santas Stash', sku: '717', price: 120, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Sherbit', sku: '24', price: 90, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Sour Diesel', sku: '693', price: 90, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Space Jam', sku: '234', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Sugar High', sku: '690', price: 120, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze The Baddie', sku: '541', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Tropical Pineapple', sku: '689', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Just Blaze Wednesday Adams', sku: '451', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'K-Snow', sku: '720', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'King Truck', sku: 'IN-KING-TRUCK', price: 100, category: 'flower', track: 'lifestyle' },
  { name: 'Kings Truck', sku: '687', price: 100, category: 'flower', track: 'lifestyle' },
  { name: 'MJ Krush', sku: 'MJ-KRUSH', price: 30, category: 'flower', track: 'lifestyle' },
  { name: 'MJ Pre-Rolls', sku: 'MJ-PRE-ROLLS', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'MJ Roll', sku: '71', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'MJ Roll Mix', sku: 'MJ-ROLL-MIX', price: 30, category: 'flower', track: 'lifestyle' },
  { name: 'Mochi', sku: 'MOCHI', price: 120, category: 'flower', track: 'lifestyle' },
  { name: 'Monster Zkittles', sku: '646', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Moon Stick (G.D)', sku: '966', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'Moon Stick (I.D)', sku: '85', price: 100, category: 'flower', track: 'lifestyle' },
  { name: 'Moonsticks', sku: 'MOONSTICKS', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'PINK RUNTZ', sku: '683', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'PURPLE PEANUT BUTTER', sku: '572', price: 100, category: 'flower', track: 'lifestyle' },
  { name: 'Perfect Joint (Single)', sku: 'PERFECT-JOINT-SINGLE', price: 10, category: 'flower', track: 'lifestyle' },
  { name: 'Pink Cookies', sku: '538', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Pitbull', sku: '86', price: 100, category: 'flower', track: 'lifestyle' },
  { name: 'Pitbull Pops', sku: 'PITBULL-POPS', price: 100, category: 'flower', track: 'lifestyle' },
  { name: 'Pre Rolls', sku: 'PRE-ROLLS-CONES', price: 0, category: 'flower', track: 'lifestyle' },
  { name: 'Premium Blend Pre-Roll', sku: '53', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'Prime Cheese', sku: 'PRIME-CHEESE', price: 60, category: 'flower', track: 'lifestyle' },
  { name: 'Queen of the South', sku: 'QUEEN-OF-THE-SOUTH', price: 120, category: 'flower', track: 'lifestyle' },
  { name: 'RAINBOW ROYALE (I.D)', sku: '682', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Rainbow Royale', sku: 'RAINBOW-ROYALE', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Rainbow Runtz', sku: '490', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Rainbow Sherbet', sku: 'RAINBOW-SHERBET', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Rainbow Sherbit (I.D)', sku: '681', price: 150, category: 'flower', track: 'lifestyle' },
  { name: 'Singles', sku: '380', price: 40, category: 'flower', track: 'lifestyle' },
  { name: 'Strawberry Lemonade', sku: 'GD-STRAWBERRY-LEMONADE', price: 40, category: 'flower', track: 'lifestyle' },
  { name: 'Strawberry Lemonade (SPECIAL)', sku: '972', price: 40, category: 'flower', track: 'lifestyle' },
  { name: 'Super Cheese', sku: '775', price: 50, category: 'flower', track: 'lifestyle' },
  { name: 'Super Cheese (5g) i.d', sku: '485', price: 500, category: 'flower', track: 'lifestyle' },
  { name: 'The Church (5g) g.d', sku: '658', price: 300, category: 'flower', track: 'lifestyle' },
  { name: 'The Church Pre-Rolls', sku: '694', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'Watermelon runtz Pre-Roll', sku: '695', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'White Runtz', sku: 'WHITE-RUNTZ', price: 100, category: 'flower', track: 'lifestyle' },
  { name: 'White Runtz (5g) g.d', sku: '659', price: 300, category: 'flower', track: 'lifestyle' },
  { name: 'XL', sku: 'XL', price: 50, category: 'flower', track: 'lifestyle' },
  { name: 'Zoap', sku: '719', price: 80, category: 'flower', track: 'lifestyle' },
  { name: 'perfect joint (box)', sku: '222', price: 130, category: 'flower', track: 'lifestyle' },
  { name: 'perfect joint (sng)', sku: '223', price: 10, category: 'flower', track: 'lifestyle' },

  // === LIFESTYLE-CBD (17) ===
  { name: 'Ashwaganda Lifted', sku: '150', price: 345, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'CBD Arouse', sku: '458', price: 220, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'CBD Bunny Men', sku: '459', price: 220, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'CBD Erect', sku: '457', price: 220, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'CBD Super Bunny Woman', sku: '466', price: 200, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Coffee Latte Lions Chaga', sku: '491', price: 600, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Cordyceps', sku: '716', price: 500, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Dope Grapefruit', sku: '301', price: 30, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Dope Pineapple', sku: '302', price: 30, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Dope Watermelon', sku: '303', price: 30, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Fruity CBD Gummies 250mg', sku: '349', price: 300, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Lucky Club Juice', sku: '330', price: 100, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Pastilles CBD', sku: '437', price: 250, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Sodaze', sku: '411', price: 80, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Water', sku: '304', price: 15, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Wave Hydration CBD', sku: 'WAVE-HYDRATION-CBD', price: 200, category: 'lifestyle-cbd', track: 'lifestyle' },
  { name: 'Wave Hydration Drink CBD', sku: '436', price: 200, category: 'lifestyle-cbd', track: 'lifestyle' },

  // === TOPICALS (5) ===
  { name: '20ml THC Oil Drops', sku: '134', price: 300, category: 'topicals', track: 'lifestyle' },
  { name: 'Hairfood 125ml', sku: '821', price: 170, category: 'topicals', track: 'lifestyle' },
  { name: 'Hairfood 250ml', sku: '822', price: 280, category: 'topicals', track: 'lifestyle' },
  { name: 'Herbal Pain Balm', sku: '480', price: 600, category: 'topicals', track: 'lifestyle' },
  { name: 'MJ Cream', sku: '165', price: 150, category: 'topicals', track: 'lifestyle' },

  // === VAPES (5) ===
  { name: '1ml Carts', sku: '112', price: 500, category: 'vapes', track: 'lifestyle' },
  { name: 'Batteries', sku: '113', price: 240, category: 'vapes', track: 'lifestyle' },
  { name: 'Cell Battery', sku: '343', price: 600, category: 'vapes', track: 'lifestyle' },
  { name: 'Disposable Vapes', sku: '118', price: 500, category: 'vapes', track: 'lifestyle' },
  { name: 'Disposable Vapes (Rossen)', sku: '216', price: 600, category: 'vapes', track: 'lifestyle' },

  // === VAPORIZERS (1) ===
  { name: 'Portable Dry Herb Vaporizer', sku: 'ACC-VAPE-PORT', price: 899, category: 'vaporizers', track: 'lifestyle' },

  // ============================================================
  // NEW ITEMS FROM POWER'S BACK STORE ROOM (not yet on production)
  // These enter MDC pipeline as 'pending' for review
  // ============================================================

  // === SILVERBACK PRE-ROLLS (9) ===
  { name: 'Silverback Marshmallow', sku: 'SB-MARSHMALLOW', price: 80, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Silverback Space Jam', sku: 'SB-SPACE-JAM', price: 80, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Silverback King Juice', sku: 'SB-KING-JUICE', price: 80, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Silverback Harry Potter', sku: 'SB-HARRY-POTTER', price: 80, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Silverback OG Kush', sku: 'SB-OG-KUSH', price: 80, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Silverback Skittles', sku: 'SB-SKITTLES', price: 80, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Silverback Gorilla Skittles', sku: 'SB-GORILLA-SKITTLES', price: 80, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Silverback Blockers Hydro', sku: 'SB-BLOCKERS-HYDRO', price: 80, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Silverback Yum Yum', sku: 'SB-YUM-YUM', price: 80, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },

  // === JUST BLAZE NEW VARIANTS (3) ===
  { name: 'Just Blaze Beetle Juice', sku: 'JB-BEETLE-JUICE', price: 150, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Just Blaze Blaze Royale Indica', sku: 'JB-BLAZE-ROYALE-IND', price: 800, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Just Blaze Blaze Royale Sativa', sku: 'JB-BLAZE-ROYALE-SAT', price: 800, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },

  // === PRE-ROLLS NEW (1) ===
  { name: 'Moonsticks Greendoor', sku: 'MOONSTICKS-GD', price: 80, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },

  // === PRE-PACKS 5g (2) ===
  { name: 'Le Chron (5g)', sku: 'PP-LE-CHRON-5G', price: 300, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Original Blitz (5g)', sku: 'PP-ORIGINAL-BLITZ-5G', price: 300, category: 'flower', track: 'lifestyle', mdcStage: 'pending' },

  // === THC/CBD NEW (6) ===
  { name: 'THC Fizz', sku: 'THC-FIZZ', price: 80, category: 'lifestyle-cbd', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Cannabis Spray', sku: 'CANNABIS-SPRAY', price: 200, category: 'lifestyle-cbd', track: 'medical', mdcStage: 'pending' },
  { name: 'Tongkat Ali', sku: 'TONGKAT-ALI', price: 300, category: 'lifestyle-cbd', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Clit-Oh-Max', sku: 'CLIT-OH-MAX', price: 200, category: 'lifestyle-cbd', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Hair Oil', sku: 'HAIR-OIL', price: 150, category: 'topicals', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Bath Salts', sku: 'BATH-SALTS', price: 150, category: 'topicals', track: 'lifestyle', mdcStage: 'pending' },

  // === ACCESSORIES NEW (23) ===
  { name: 'Dab Rig Small', sku: 'ACC-DAB-RIG-SM', price: 350, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Ashtray', sku: 'ACC-ASHTRAY', price: 80, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Steel Ashtray', sku: 'ACC-STEEL-ASHTRAY', price: 120, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Pay Pay Blades', sku: 'ACC-PAYPAY-BLADES', price: 40, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Blue Torch', sku: 'ACC-BLUE-TORCH', price: 150, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Elements Papers', sku: 'ACC-ELEMENTS', price: 30, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Raw Blades', sku: 'ACC-RAW-BLADES', price: 40, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Blazy Susan Papers', sku: 'ACC-BLAZY-SUSAN', price: 50, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'OCB Black Papers', sku: 'ACC-OCB-BLACK', price: 30, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'OCB Brown Papers', sku: 'ACC-OCB-BROWN', price: 30, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Mr Joint Set Small', sku: 'ACC-MRJOINT-SM', price: 150, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Mr Joint Set Medium', sku: 'ACC-MRJOINT-MD', price: 200, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Mr Joint Set Big', sku: 'ACC-MRJOINT-LG', price: 250, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Tray Set', sku: 'ACC-TRAY-SET', price: 200, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Normal Lighter', sku: 'ACC-LIGHTER-NORM', price: 15, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Clipper Lighter', sku: 'ACC-CLIPPER', price: 50, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Wood Pipe', sku: 'ACC-WOOD-PIPE', price: 100, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Top Puff', sku: 'ACC-TOP-PUFF', price: 150, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Large Tray', sku: 'ACC-TRAY-LG', price: 150, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Big Tray Set', sku: 'ACC-TRAY-SET-BIG', price: 250, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Small Tray Set', sku: 'ACC-TRAY-SET-SM', price: 120, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Small Tray', sku: 'ACC-TRAY-SM', price: 80, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
  { name: 'Medium Tray', sku: 'ACC-TRAY-MD', price: 120, category: 'accessories', track: 'lifestyle', mdcStage: 'pending' },
];

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB:', uri);

  // Check existing
  const existingCount = await Product.countDocuments();
  console.log('Existing products:', existingCount);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const p of products) {
    try {
      const exists = await Product.findOne({ sku: p.sku });
      if (exists) {
        skipped++;
        continue;
      }

      const stage = p.mdcStage || 'live';
      const isLive = stage === 'live';
      await Product.create({
        name: p.name,
        sku: p.sku,
        price: p.price,
        category: p.category,
        track: p.track,
        description: p.name,
        status: isLive ? 'active' : 'draft',
        isPublished: isLive,
        mdcStage: stage,
        inventory: {
          quantity: isLive ? 50 : 0,
          reserved: 0,
          lowStockThreshold: 10,
          trackQuantity: true,
          allowBackorder: false
        }
      });
      inserted++;
    } catch (err) {
      // Handle duplicate slug
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0];
        try {
          const suffix = '-' + Math.random().toString(36).substring(2, 6);
          const retryStage = p.mdcStage || 'live';
          const retryIsLive = retryStage === 'live';
          const retryData = {
            name: p.name,
            sku: field === 'sku' ? p.sku + suffix : p.sku,
            slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + suffix,
            price: p.price,
            category: p.category,
            track: p.track,
            description: p.name,
            status: retryIsLive ? 'active' : 'draft',
            isPublished: retryIsLive,
            mdcStage: retryStage,
            inventory: { quantity: retryIsLive ? 50 : 0, reserved: 0, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false }
          };
          await Product.create(retryData);
          inserted++;
        } catch (retryErr) {
          console.error('  SKIP (duplicate):', p.name, '-', retryErr.message);
          errors++;
        }
      } else {
        console.error('  ERROR:', p.name, '-', err.message);
        errors++;
      }
    }
  }

  const finalCount = await Product.countDocuments();
  console.log('\n=== SEED COMPLETE ===');
  console.log('Inserted:', inserted);
  console.log('Skipped (already exist):', skipped);
  console.log('Errors:', errors);
  console.log('Total products now:', finalCount);

  await mongoose.disconnect();
}

seed().catch(err => { console.error('Fatal:', err); process.exit(1); });
