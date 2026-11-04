import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { ADDITIONAL_PRODUCTS } from '../src/data/additionalProducts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Curated catalog based on Onix Wares products with normalized CDN images
export const ONIX_PRODUCTS = [
  {
    id: 1,
    title: 'Fjallraven - Foldsack No. 1 Backpack, Fits 15 Laptops',
    price: 109.95,
    originalPrice: 129.95,
    description:
      'Your perfect pack for everyday use and walks in the forest. Stash your laptop (up to 15 inches) in the padded sleeve, your everyday gear in the main compartment, and small items in the zip-close pocket.',
    category: "men's clothing",
    image: 'https://m.media-amazon.com/images/I/81fPKd-2AYL._AC_SL1500.jpg',
    rating: { rate: 3.9, count: 120 },
    sizes: ['One Size'],
    colors: [
      { name: 'Olive Green', hex: '#4f5d47' },
      { name: 'Deep Navy', hex: '#1e3a5f' },
      { name: 'Oxblood Red', hex: '#722f37' },
    ],
    inStock: true,
    availableQuantity: 45,
    featured: true,
    isNewArrival: false,
    subcategory: 'Bags & Backpacks',
    gender: 'Unisex',
  },
  {
    id: 2,
    title: 'Mens Casual Premium Slim Fit T-Shirts',
    price: 22.3,
    originalPrice: 29.99,
    description:
      'Slim-fitting style, contrast raglan long sleeve, three-button henley placket, light weight & soft fabric for breathable and comfortable wearing. Solid stitched shirts with round neck made for durability.',
    category: "men's clothing",
    image: 'https://m.media-amazon.com/images/I/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY.jpg',
    rating: { rate: 4.1, count: 259 },
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Onyx Black', hex: '#1c1917' },
      { name: 'Heather Grey', hex: '#64748b' },
      { name: 'Navy Blue', hex: '#1e3a5f' },
    ],
    inStock: true,
    availableQuantity: 120,
    featured: true,
    isNewArrival: true,
    subcategory: 'Shirts & Henley',
    gender: 'Men',
  },
  {
    id: 3,
    title: 'Mens Cotton Jacket',
    price: 55.99,
    originalPrice: 79.99,
    description:
      'Great outerwear jackets for Spring/Autumn/Winter, suitable for many occasions such as working, hiking, camping, mountain/rock climbing, cycling, traveling or other outdoors. Good gift choice for you or your family member.',
    category: "men's clothing",
    image: 'https://m.media-amazon.com/images/I/71li-ujtlUL._AC_UX679.jpg',
    rating: { rate: 4.7, count: 500 },
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Khaki Stone', hex: '#c2b280' },
      { name: 'Midnight Black', hex: '#18181b' },
      { name: 'Army Olive', hex: '#3d4b3c' },
    ],
    inStock: true,
    availableQuantity: 65,
    featured: true,
    isNewArrival: false,
    subcategory: 'Jackets & Outerwear',
    gender: 'Men',
  },
  {
    id: 4,
    title: 'Mens Casual Slim Fit',
    price: 15.99,
    originalPrice: 19.99,
    description:
      'The color could be slightly different between on the screen and in practice. Please note that body builds vary by person, therefore, detailed size information should be reviewed below on the product description.',
    category: "men's clothing",
    image: 'https://m.media-amazon.com/images/I/71YXzeOuslL._AC_UY879.jpg',
    rating: { rate: 2.1, count: 430 },
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Onyx Black', hex: '#1c1917' },
      { name: 'Heather Grey', hex: '#64748b' },
      { name: 'Warm Cream', hex: '#f5efe6' },
    ],
    inStock: true,
    availableQuantity: 80,
    featured: false,
    isNewArrival: false,
    subcategory: 'Casual Tees',
    gender: 'Men',
  },
  {
    id: 5,
    title: "John Hardy Women's Legends Naga Gold & Silver Dragon Station Chain Bracelet",
    price: 695.0,
    originalPrice: 750.0,
    description:
      "From our Legends Collection, the Naga was inspired by the mythical water dragon that protects the ocean's pearl. Wear facing inward to be bestowed with love and abundance, or outward for protection.",
    category: 'jewelry',
    image: 'https://m.media-amazon.com/images/I/71pWzhdJNwL._AC_UL640_QL65_ML3.jpg',
    rating: { rate: 4.6, count: 400 },
    sizes: ['One Size'],
    colors: [
      { name: 'Sterling Silver', hex: '#d1d5db' },
      { name: '18K Gold', hex: '#eab308' },
    ],
    inStock: true,
    availableQuantity: 15,
    featured: true,
    isNewArrival: true,
    subcategory: 'Bracelets',
    gender: 'Women',
  },
  {
    id: 6,
    title: 'Solid Gold Petite Micropave Diamond Ring',
    price: 168.0,
    originalPrice: 210.0,
    description:
      'Satisfaction Guaranteed. Return or exchange any order within 30 days. Designed and handcrafted in fine gold with glistening pavé stones for subtle everyday brilliance.',
    category: 'jewelry',
    image: 'https://m.media-amazon.com/images/I/61sbMiUnoGL._AC_UL640_QL65_ML3.jpg',
    rating: { rate: 3.9, count: 70 },
    sizes: ['Size 6', 'Size 7', 'Size 8'],
    colors: [
      { name: 'Rose Gold', hex: '#fb7185' },
      { name: 'Yellow Gold', hex: '#eab308' },
      { name: 'White Gold', hex: '#e2e8f0' },
    ],
    inStock: true,
    availableQuantity: 28,
    featured: false,
    isNewArrival: false,
    subcategory: 'Rings',
    gender: 'Women',
  },
  {
    id: 7,
    title: 'White Gold Plated Princess Solitaire Diamond Engagement Ring',
    price: 9.99,
    originalPrice: 15.99,
    description:
      "Classic Created Wedding Engagement Solitaire Diamond Promise Ring for Her. Gifts to spoil your love more for Engagement, Wedding, Anniversary, Valentine's Day...",
    category: 'jewelry',
    image: 'https://m.media-amazon.com/images/I/71YAIFU48IL._AC_UL640_QL65_ML3.jpg',
    rating: { rate: 3.0, count: 400 },
    sizes: ['Size 6', 'Size 7', 'Size 8'],
    colors: [{ name: 'Silver Rhodium', hex: '#cbd5e1' }],
    inStock: true,
    availableQuantity: 95,
    featured: false,
    isNewArrival: true,
    subcategory: 'Rings',
    gender: 'Women',
  },
  {
    id: 8,
    title: 'Pierced Owl Rose Gold Plated Stainless Steel Flared Tunnel Plug Earrings',
    price: 10.99,
    originalPrice: 14.99,
    description:
      'Rose Gold Plated Flared Tunnel Plug Earrings. Made of 316L Surgical Grade Stainless Steel, polished smooth for comfortable daily wear.',
    category: 'jewelry',
    image: 'https://m.media-amazon.com/images/I/51UDEzMJVpL._AC_UL640_QL65_ML3.jpg',
    rating: { rate: 1.9, count: 100 },
    sizes: ['One Size'],
    colors: [
      { name: 'Rose Gold', hex: '#fb7185' },
      { name: 'Metallic Gold', hex: '#eab308' },
    ],
    inStock: true,
    availableQuantity: 50,
    featured: false,
    isNewArrival: false,
    subcategory: 'Earrings',
    gender: 'Unisex',
  },
  {
    id: 15,
    title: "BIYLACLESEN Women's 3-in-1 Snowboard Jacket Winter Coat",
    price: 56.99,
    originalPrice: 79.99,
    description:
      'Note: The Jackets is US standard size, Please choose size as your usual wear. Material: 100% Polyester; Detachable Liner Fabric: Warm Fleece. Stand collar, liner with front full zip closure and side zipped pockets.',
    category: "women's clothing",
    image: 'https://m.media-amazon.com/images/I/51Y5NI-I5jL._AC_UX679.jpg',
    rating: { rate: 2.6, count: 235 },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Crimson Red', hex: '#b91c1c' },
      { name: 'Onyx Black', hex: '#1c1917' },
      { name: 'Royal Purple', hex: '#7e22ce' },
    ],
    inStock: true,
    availableQuantity: 40,
    featured: false,
    isNewArrival: true,
    subcategory: 'Jackets & Outerwear',
    gender: 'Women',
  },
  {
    id: 16,
    title: "Lock and Love Women's Removable Hooded Faux Leather Moto Biker Jacket",
    price: 29.95,
    originalPrice: 42.0,
    description:
      '100% POLYURETHANE (shell) 100% POLYESTER (lining). Faux leather material for style and comfort / 2 pockets of front, 2-For-One Hooded denim style faux leather jacket, Button detail on waist / Detail stitching at sides.',
    category: "women's clothing",
    image: 'https://m.media-amazon.com/images/I/81XH0e8fefL._AC_UY879.jpg',
    rating: { rate: 2.9, count: 340 },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Caramel Brown', hex: '#92400e' },
      { name: 'Jet Black', hex: '#09090b' },
      { name: 'Cognac', hex: '#78350f' },
    ],
    inStock: true,
    availableQuantity: 55,
    featured: true,
    isNewArrival: false,
    subcategory: 'Jackets & Outerwear',
    gender: 'Women',
  },
  {
    id: 17,
    title: 'Rain Jacket Women Windbreaker Striped Climbing Raincoats',
    price: 39.99,
    originalPrice: 49.99,
    description:
      'Lightweight perfect for casual or outdoor sports like climbing, running, cycling, camping, hiking, picnic, walking, etc. Waterproof breathable fabric with striped lining for an elegant nautical touch.',
    category: "women's clothing",
    image: 'https://m.media-amazon.com/images/I/71HblAHs5xL._AC_UY879_-2t.jpg',
    rating: { rate: 3.8, count: 679 },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Canary Yellow', hex: '#f0c042' },
      { name: 'Striped Navy', hex: '#1e3a5f' },
      { name: 'Powder Blue', hex: '#87a7b8' },
    ],
    inStock: true,
    availableQuantity: 60,
    featured: false,
    isNewArrival: true,
    subcategory: 'Jackets & Rainwear',
    gender: 'Women',
  },
  {
    id: 18,
    title: "MBJ Women's Solid Short Sleeve Boat Neck V-Neck",
    price: 9.85,
    originalPrice: 14.5,
    description:
      '95% RAYON 5% SPANDEX, Made in USA or Imported, Do Not Bleach, Lightweight fabric with great stretch for comfort, Ribbed on sleeves and neckline / Double stitching on bottom hem.',
    category: "women's clothing",
    image: 'https://m.media-amazon.com/images/I/71z3kpMAYsL._AC_UY879.jpg',
    rating: { rate: 4.7, count: 130 },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Onyx Black', hex: '#1c1917' },
      { name: 'Heather Grey', hex: '#64748b' },
      { name: 'Warm Cream', hex: '#f5efe6' },
    ],
    inStock: true,
    availableQuantity: 110,
    featured: true,
    isNewArrival: false,
    subcategory: 'Tops & Tees',
    gender: 'Women',
  },
  {
    id: 19,
    title: "Opna Women's Short Sleeve Moisture Wicking Athletic T-Shirt",
    price: 7.95,
    originalPrice: 11.99,
    description:
      '100% Polyester, Machine wash, 100% cationic polyester interlock, Machine Wash & Pre Shrunk for a Great Fit, Lightweight, roomy and highly breathable with moisture wicking fabric which helps to keep moisture away.',
    category: "women's clothing",
    image: 'https://m.media-amazon.com/images/I/51eg55uWmdL._AC_UX679.jpg',
    rating: { rate: 4.5, count: 146 },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Midnight Black', hex: '#18181b' },
      { name: 'Coral Pink', hex: '#f43f5e' },
      { name: 'Teal Green', hex: '#0d9488' },
    ],
    inStock: true,
    availableQuantity: 150,
    featured: false,
    isNewArrival: false,
    subcategory: 'Activewear & Tees',
    gender: 'Women',
  },
  {
    id: 20,
    title: 'DANVOUY Womens Casual V Neck Pleated Casual Tee T-Shirt',
    price: 12.99,
    originalPrice: 18.0,
    description:
      '95%Cotton,5%Spandex, Features: Casual, Short Sleeve, Letter Print,V-Neck,Fashion Tees, The fabric is soft and has some stretch., Occasion: Casual/Office/Beach/School/Home/Street. Season: Spring,Summer,Autumn,Winter.',
    category: "women's clothing",
    image: 'https://m.media-amazon.com/images/I/61pHAEJ4NML._AC_UX679.jpg',
    rating: { rate: 3.6, count: 145 },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Onyx Black', hex: '#1c1917' },
      { name: 'Heather Grey', hex: '#64748b' },
      { name: 'Navy Blue', hex: '#1e3a5f' },
    ],
    inStock: true,
    availableQuantity: 90,
    featured: false,
    isNewArrival: false,
    subcategory: 'Tops & Tees',
    gender: 'Women',
  },
  {
    id: 101,
    title: 'Onix Pulse Wireless ANC Headphones',
    price: 199.99,
    originalPrice: 249.99,
    description:
      'Premium over-ear noise-canceling headphones with 40mm dynamic drivers, 45-hour battery life, and crystal-clear voice pickup for work and travel.',
    category: 'electronics',
    subcategory: 'Audio & Visual',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 340 },
    sizes: ['One Size'],
    colors: [
      { name: 'Matte Black', hex: '#18181b' },
      { name: 'Silver Mist', hex: '#e2e8f0' },
    ],
    inStock: true,
    availableQuantity: 80,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 102,
    title: 'ProStream 4K Ultra HD Webcam',
    price: 129.5,
    originalPrice: 149.99,
    description:
      'Studio-grade 4K video webcam with dual noise-reduction microphones, HDR auto-light correction, and magnetic privacy shutter.',
    category: 'electronics',
    subcategory: 'Peripherals & Video',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 185 },
    sizes: ['One Size'],
    colors: [{ name: 'Graphite', hex: '#334155' }],
    inStock: true,
    availableQuantity: 65,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 103,
    title: 'Aura Smart Ambient Soundbar',
    price: 279.0,
    originalPrice: 329.0,
    description:
      'Immersive 3.1 channel Dolby Atmos soundbar with wireless subwoofer and integrated voice assistant control.',
    category: 'electronics',
    subcategory: 'Audio & Visual',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 210 },
    sizes: ['One Size'],
    colors: [{ name: 'Onyx Black', hex: '#0f172a' }],
    inStock: true,
    availableQuantity: 40,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 104,
    title: 'Nordic Minimalist Oak Coffee Table',
    price: 349.0,
    originalPrice: 420.0,
    description:
      'Handcrafted solid white oak coffee table with clean Scandinavian silhouettes, soft beveled edges, and durable matte finish.',
    category: 'furniture',
    subcategory: 'Living Room Furniture',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 98 },
    sizes: ['Standard (48" x 24")'],
    colors: [
      { name: 'Natural Oak', hex: '#d4b996' },
      { name: 'Smoked Walnut', hex: '#5c4033' },
    ],
    inStock: true,
    availableQuantity: 25,
    featured: true,
    isNewArrival: false,
  },
  {
    id: 105,
    title: 'ErgoPro Mesh Executive Chair',
    price: 399.0,
    originalPrice: 499.0,
    description:
      'High-back ergonomic office chair featuring dynamic lumbar support, 4D adjustable armrests, and breathable cooling mesh.',
    category: 'furniture',
    subcategory: 'Office & Workspace',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1580481077195-c3f9904229ea?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 142 },
    sizes: ['Adjustable'],
    colors: [
      { name: 'Carbon Black', hex: '#1e293b' },
      { name: 'Slate Grey', hex: '#64748b' },
    ],
    inStock: true,
    availableQuantity: 30,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 106,
    title: 'Artisan Ceramic Pour-Over Coffee Set',
    price: 54.99,
    originalPrice: 65.0,
    description:
      'Hand-glazed ceramic dripper with heat-resistant borosilicate glass carafe and precision stainless steel reusable mesh filter.',
    category: 'furniture',
    subcategory: 'Kitchen & Tabletop',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 88 },
    sizes: ['600ml / 4 Cup'],
    colors: [
      { name: 'Speckled Clay', hex: '#e7e5e4' },
      { name: 'Terracotta', hex: '#c2410c' },
    ],
    inStock: true,
    availableQuantity: 75,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 107,
    title: 'Luxe Santal & Amber Eau de Parfum',
    price: 115.0,
    originalPrice: 135.0,
    description:
      'An exquisite unisex fragrance blending rich Mysore sandalwood, cardamom, warm golden amber resin, and velvety iris notes.',
    category: 'fragrances',
    subcategory: 'Eau de Parfum',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 310 },
    sizes: ['50ml', '100ml'],
    colors: [{ name: 'Amber Glass', hex: '#d97706' }],
    inStock: true,
    availableQuantity: 50,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 108,
    title: 'Radiance Botanical Vitamin C Serum',
    price: 48.0,
    originalPrice: 60.0,
    description:
      'Triple-antioxidant brightening facial serum enriched with 15% pure L-ascorbic acid, hyaluronic acid, and kakadu plum extract.',
    category: 'beauty',
    subcategory: 'Facial Skincare',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 420 },
    sizes: ['30ml'],
    colors: [{ name: 'Amber Dropper', hex: '#b45309' }],
    inStock: true,
    availableQuantity: 110,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 110,
    title: 'Single-Origin Ethiopian Yirgacheffe Coffee Beans',
    price: 24.5,
    originalPrice: 28.0,
    description:
      'Washed process whole bean coffee with delicate floral jasmine notes, bergamot citrus brightness, and honey sweetness. 12oz bag.',
    category: 'groceries',
    subcategory: 'Specialty Coffee',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 180 },
    sizes: ['12 oz Whole Bean', '2 lb Whole Bean'],
    colors: [{ name: 'Kraft Bag', hex: '#a8a29e' }],
    inStock: true,
    availableQuantity: 150,
    featured: false,
    isNewArrival: true,
  },
  {
    id: 111,
    title: 'Cold-Pressed Sicilian Extra Virgin Olive Oil',
    price: 32.0,
    originalPrice: 38.0,
    description:
      'First cold-pressed Nocellara del Belice olives from certified organic groves in western Sicily. Notes of fresh cut grass, artichoke, and green almond.',
    category: 'groceries',
    subcategory: 'Gourmet Pantry',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 125 },
    sizes: ['500ml', '750ml'],
    colors: [{ name: 'Dark Emerald Bottle', hex: '#064e3b' }],
    inStock: true,
    availableQuantity: 100,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 21,
    title: "Men's Tailored Italian Wool Blend Blazer",
    price: 189.0,
    originalPrice: 225.0,
    description:
      'Structured two-button blazer crafted from a breathable Italian wool blend. Features notch lapels, interior jet pockets, and double back vents for modern formal and smart-casual styling.',
    category: "men's clothing",
    subcategory: 'Tailoring & Outerwear',
    gender: 'Men',
    image:
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 142 },
    sizes: ['38R', '40R', '42R', '44R'],
    colors: [
      { name: 'Navy Melange', hex: '#1e293b' },
      { name: 'Charcoal', hex: '#334155' },
    ],
    inStock: true,
    availableQuantity: 45,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 22,
    title: "Men's Slim-Fit Stretch Chino Trousers",
    price: 68.0,
    originalPrice: 85.0,
    description:
      'Modern tapered chinos tailored in durable stretch organic cotton twill. Pre-washed for a soft handfeel with angled side pockets and horn buttons.',
    category: "men's clothing",
    subcategory: 'Pants & Trousers',
    gender: 'Men',
    image:
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.6, count: 210 },
    sizes: ['30x32', '32x32', '34x32', '36x32'],
    colors: [
      { name: 'British Khaki', hex: '#d4b996' },
      { name: 'Olive Drab', hex: '#4d533c' },
    ],
    inStock: true,
    availableQuantity: 80,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 23,
    title: "Men's Crisp Poplin Button-Down Dress Shirt",
    price: 54.0,
    originalPrice: 65.0,
    description:
      'Classic long-sleeve dress shirt woven from 100% two-ply Egyptian cotton poplin. Features a semi-spread collar, mother-of-pearl buttons, and wrinkle-resistant finish.',
    category: "men's clothing",
    subcategory: 'Shirts & Tops',
    gender: 'Men',
    image:
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 185 },
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Optic White', hex: '#f8fafc' },
      { name: 'French Blue', hex: '#60a5fa' },
    ],
    inStock: true,
    availableQuantity: 95,
    featured: false,
    isNewArrival: true,
  },
  {
    id: 24,
    title: "Men's Handcrafted Italian Leather Oxford Shoes",
    price: 165.0,
    originalPrice: 195.0,
    description:
      'Formal cap-toe oxfords artisanally crafted from hand-burnished calfskin leather. Built with Goodyear welted leather soles and cushioned memory foam footbeds.',
    category: "men's clothing",
    subcategory: 'Footwear & Shoes',
    gender: 'Men',
    image:
      'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 96 },
    sizes: ['8', '9', '10', '11', '12'],
    colors: [
      { name: 'Cognac Brown', hex: '#78350f' },
      { name: 'Polished Black', hex: '#0f172a' },
    ],
    inStock: true,
    availableQuantity: 35,
    featured: true,
    isNewArrival: false,
  },
  {
    id: 25,
    title: "Men's Minimalist Low-Top White Leather Sneakers",
    price: 110.0,
    originalPrice: 130.0,
    description:
      'Sleek court sneakers made from smooth Italian nappa leather with durable margom rubber soles. Perfect pairing for casual trousers or relaxed suiting.',
    category: "men's clothing",
    subcategory: 'Footwear & Shoes',
    gender: 'Men',
    image:
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 320 },
    sizes: ['8', '9', '10', '11', '12'],
    colors: [{ name: 'Chalk White', hex: '#f1f5f9' }],
    inStock: true,
    availableQuantity: 60,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 26,
    title: "Men's Merino Wool Ribbed Crewneck Sweater",
    price: 88.0,
    originalPrice: 110.0,
    description:
      'Extra-fine 19.5-micron Australian merino wool knit sweater. Lightweight thermal regulation, naturally odor-resistant, with ribbed cuffs and hem.',
    category: "men's clothing",
    subcategory: 'Knitwear & Sweaters',
    gender: 'Men',
    image:
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 148 },
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Oatmeal Heather', hex: '#e2e8f0' },
      { name: 'Forest Green', hex: '#14532d' },
    ],
    inStock: true,
    availableQuantity: 50,
    featured: false,
    isNewArrival: true,
  },
  {
    id: 27,
    title: "Women's Silk Satin Midi Slip Dress",
    price: 145.0,
    originalPrice: 175.0,
    description:
      'Lustrous 19mm mulberry silk satin slip dress cut on the bias for a graceful liquid drape. Adjustable delicate straps and soft cowl neckline.',
    category: "women's clothing",
    subcategory: 'Dresses',
    gender: 'Women',
    image:
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 175 },
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Champagne Gold', hex: '#fef08a' },
      { name: 'Midnight Noir', hex: '#09090b' },
    ],
    inStock: true,
    availableQuantity: 40,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 28,
    title: "Women's Relaxed Double-Breasted Linen Blazer",
    price: 135.0,
    originalPrice: 160.0,
    description:
      'Tailored from breathable 100% European flax linen. Effortless slightly oversized silhouette with horn-effect buttons and light shoulder pad structure.',
    category: "women's clothing",
    subcategory: 'Jackets & Blazers',
    gender: 'Women',
    image:
      'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 130 },
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Natural Ecru', hex: '#f5f5f4' },
      { name: 'Terracotta', hex: '#9a3412' },
    ],
    inStock: true,
    availableQuantity: 55,
    featured: false,
    isNewArrival: true,
  },
  {
    id: 29,
    title: "Women's High-Waisted Wide-Leg Tailored Trousers",
    price: 92.0,
    originalPrice: 115.0,
    description:
      'Fluid wide-leg trousers featuring front pleats, slant pockets, and a clean hook-and-bar closure. Woven from wrinkle-resistant stretch crepe.',
    category: "women's clothing",
    subcategory: 'Pants & Trousers',
    gender: 'Women',
    image:
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 190 },
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Sand Taupe', hex: '#d6d3d1' },
      { name: 'Jet Black', hex: '#18181b' },
    ],
    inStock: true,
    availableQuantity: 70,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 30,
    title: "Women's Silk Crepe de Chine Button-Up Blouse",
    price: 85.0,
    originalPrice: 105.0,
    description:
      'Pure silk crepe de chine shirt with a fluid matte finish. Tailored with French seams, mother-of-pearl buttons, and rounded convertible cuffs.',
    category: "women's clothing",
    subcategory: 'Shirts & Blouses',
    gender: 'Women',
    image:
      'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.6, count: 145 },
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Ivory Pearl', hex: '#fafaf9' },
      { name: 'Dusty Rose', hex: '#fda4af' },
    ],
    inStock: true,
    availableQuantity: 65,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 31,
    title: "Women's Pointed-Toe Leather Mule Pumps",
    price: 128.0,
    originalPrice: 155.0,
    description:
      'Sculptural 65mm flared kitten heel mules crafted in butter-soft Italian lambskin leather. Padded leather insole provides day-to-night comfort.',
    category: "women's clothing",
    subcategory: 'Footwear & Heels',
    gender: 'Women',
    image:
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 112 },
    sizes: ['6', '7', '8', '9', '10'],
    colors: [
      { name: 'Caramel Leather', hex: '#92400e' },
      { name: 'Onyx Black', hex: '#171717' },
    ],
    inStock: true,
    availableQuantity: 40,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 32,
    title: "Women's Pleated Georgette A-Line Midi Skirt",
    price: 78.0,
    originalPrice: 98.0,
    description:
      'Sunburst accordion pleats bring elegant kinetic movement to this lightweight georgette midi skirt. Fitted with an elasticized grosgrain waistband.',
    category: "women's clothing",
    subcategory: 'Skirts',
    gender: 'Women',
    image:
      'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 98 },
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Sage Green', hex: '#84a98c' },
      { name: 'Soft Cream', hex: '#fffbeb' },
    ],
    inStock: true,
    availableQuantity: 50,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 33,
    title: 'Classic Full-Grain Leather Dress Belt',
    price: 48.0,
    originalPrice: 60.0,
    description:
      'Vegetable-tanned full-grain bridle leather belt with beveled edge detailing and a brushed solid brass buckle. An essential styling anchor for trousers and suits.',
    category: 'jewelry',
    subcategory: 'Accessories',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 240 },
    sizes: ['32', '34', '36', '38'],
    colors: [
      { name: 'Saddle Tan', hex: '#78350f' },
      { name: 'Black Brass', hex: '#09090b' },
    ],
    inStock: true,
    availableQuantity: 85,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 34,
    title: 'Structured Italian Leather Crossbody Bag',
    price: 155.0,
    originalPrice: 190.0,
    description:
      'Geometric saddle-shaped crossbody handbag in smooth Tuscan box calf leather. Features magnetic flap closure, gold-plated hardware, and suede lining.',
    category: 'jewelry',
    subcategory: 'Bags & Leather',
    gender: 'Women',
    image:
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 165 },
    sizes: ['One Size'],
    colors: [
      { name: 'Chestnut Brown', hex: '#854d0e' },
      { name: 'Noir', hex: '#18181b' },
    ],
    inStock: true,
    availableQuantity: 30,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 35,
    title: 'Chronograph Minimalist Sapphire Watch',
    price: 210.0,
    originalPrice: 260.0,
    description:
      'Swiss quartz movement chronograph with a scratch-resistant anti-reflective sapphire crystal face, brushed 316L stainless steel case, and quick-release strap.',
    category: 'jewelry',
    subcategory: 'Watches',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 180 },
    sizes: ['40mm Case'],
    colors: [
      { name: 'Silver Mesh', hex: '#94a3b8' },
      { name: 'Rose Gold Leather', hex: '#fb7185' },
    ],
    inStock: true,
    availableQuantity: 25,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 36,
    title: 'Hammered 14k Gold Chunky Hoop Earrings',
    price: 85.0,
    originalPrice: 110.0,
    description:
      'Statement hollow-tube hoop earrings hand-crafted in 14k gold vermeil over 925 sterling silver with an artisanal light-catching hammered texture.',
    category: 'jewelry',
    subcategory: 'Fine Jewelry',
    gender: 'Women',
    image:
      'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 215 },
    sizes: ['20mm Diameter'],
    colors: [{ name: '14k Yellow Gold', hex: '#eab308' }],
    inStock: true,
    availableQuantity: 60,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 37,
    title: 'Vetiver & Cedarwood Cologne',
    price: 88.0,
    originalPrice: 105.0,
    description:
      'Earthy and warm botanical cologne featuring Haitian vetiver, smoked Virginian cedarwood, pink peppercorn, and bright bergamot top notes.',
    category: 'fragrances',
    subcategory: 'Cologne',
    gender: 'Men',
    image:
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 170 },
    sizes: ['50ml', '100ml'],
    colors: [{ name: 'Smoky Flacon', hex: '#44403c' }],
    inStock: true,
    availableQuantity: 45,
    featured: false,
    isNewArrival: true,
  },
  {
    id: 38,
    title: 'Velvet Rose & Bergamot Eau de Parfum',
    price: 95.0,
    originalPrice: 115.0,
    description:
      'Romantic floral bouquet combining Damascena rose petals, crisp Italian bergamot, creamy amber, and white musk. Long-lasting artisanal sillage.',
    category: 'fragrances',
    subcategory: 'Perfume',
    gender: 'Women',
    image:
      'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 205 },
    sizes: ['50ml', '100ml'],
    colors: [{ name: 'Frosted Blush Bottle', hex: '#f43f5e' }],
    inStock: true,
    availableQuantity: 50,
    featured: true,
    isNewArrival: false,
  },
  {
    id: 39,
    title: 'Gentle Hydrating Amino Acid Facial Cleanser',
    price: 28.0,
    originalPrice: 34.0,
    description:
      'Sulfate-free pH-balanced foaming cleanser enriched with 11 essential amino acids, green tea extract, and soothing chamomile water to cleanse without stripping moisture.',
    category: 'beauty',
    subcategory: 'Skincare',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 290 },
    sizes: ['150ml'],
    colors: [{ name: 'Frosted Glass Pump', hex: '#e2e8f0' }],
    inStock: true,
    availableQuantity: 110,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 40,
    title: 'Deep Moisture Peptide Recovery Night Cream',
    price: 46.0,
    originalPrice: 58.0,
    description:
      'Overnight restorative barrier cream infused with copper peptides, ceramides NP/AP/EOP, and squalane for intense hydration and firming elasticity.',
    category: 'beauty',
    subcategory: 'Skincare',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 185 },
    sizes: ['50ml Jar'],
    colors: [{ name: 'Opalescent Jar', hex: '#f8fafc' }],
    inStock: true,
    availableQuantity: 75,
    featured: false,
    isNewArrival: true,
  },
  {
    id: 41,
    title: 'Hydrating Rosehip Lip Oil & Treatment',
    price: 18.0,
    originalPrice: 22.0,
    description:
      'Non-sticky nourishing lip elixir formulated with cold-pressed rosehip seed oil, vitamin E, and hyaluronic filling spheres for high-shine hydration.',
    category: 'beauty',
    subcategory: 'Lip Care',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 340 },
    sizes: ['10ml Tube'],
    colors: [{ name: 'Sheer Rosé', hex: '#fb7185' }],
    inStock: true,
    availableQuantity: 140,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 42,
    title: 'Wireless Compact Mechanical Keyboard',
    price: 129.0,
    originalPrice: 155.0,
    description:
      'Precision tactile 75% layout keyboard with CNC aluminum frame, hot-swappable switches, sound-dampening silicone gaskets, and tri-mode Bluetooth/2.4G/USB-C connectivity.',
    category: 'electronics',
    subcategory: 'Workstation Gear',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 270 },
    sizes: ['75% Layout'],
    colors: [
      { name: 'Space Gray Aluminum', hex: '#475569' },
      { name: 'Chalk White', hex: '#f8fafc' },
    ],
    inStock: true,
    availableQuantity: 55,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 43,
    title: 'Temperature Control Ceramic Smart Mug',
    price: 98.0,
    originalPrice: 120.0,
    description:
      'App-controlled smart heated mug that maintains your beverage at your preferred temperature (120°F - 145°F) for up to 90 minutes or all day on the charging coaster.',
    category: 'electronics',
    subcategory: 'Smart Living',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 195 },
    sizes: ['10 oz', '14 oz'],
    colors: [
      { name: 'Matte Charcoal', hex: '#1e293b' },
      { name: 'Stone White', hex: '#f1f5f9' },
    ],
    inStock: true,
    availableQuantity: 65,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 44,
    title: 'Minimalist Dimmable LED Desk Lamp',
    price: 75.0,
    originalPrice: 92.0,
    description:
      'Architectural task lamp crafted in solid aluminum and steel with smooth rotary dimming, 5 color temperature settings, and flicker-free circadian optical diffusion.',
    category: 'furniture',
    subcategory: 'Lighting',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 160 },
    sizes: ['Standard'],
    colors: [
      { name: 'Brushed Brass', hex: '#ca8a04' },
      { name: 'Matte Black', hex: '#0f172a' },
    ],
    inStock: true,
    availableQuantity: 45,
    featured: false,
    isNewArrival: true,
  },
  {
    id: 45,
    title: 'Top-Grain Leather Desk Mat & Organizer',
    price: 52.0,
    originalPrice: 65.0,
    description:
      'Waterproof vegetable-tanned top-grain leather blotter mat with non-slip natural felt backing and an integrated magnetic cable management groove.',
    category: 'furniture',
    subcategory: 'Office Accents',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 230 },
    sizes: ['Medium 31x15"', 'Large 36x18"'],
    colors: [
      { name: 'Saddle Brown', hex: '#78350f' },
      { name: 'Midnight Navy', hex: '#0f172a' },
    ],
    inStock: true,
    availableQuantity: 70,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 46,
    title: 'Artisanal Organic Jasmine Green Tea Reserve',
    price: 22.0,
    originalPrice: 28.0,
    description:
      'High-mountain spring harvest green tea naturally scented seven times with fresh organic night-blooming jasmine blossoms. Delicate floral aromatics and smooth finish.',
    category: 'groceries',
    subcategory: 'Artisanal Teas',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 155 },
    sizes: ['100g Loose Leaf Tin'],
    colors: [{ name: 'Embossed Gold Tin', hex: '#d97706' }],
    inStock: true,
    availableQuantity: 120,
    featured: false,
    isNewArrival: true,
  },
  {
    id: 47,
    title: "Men's Water-Resistant Classic Trench Coat",
    price: 220.0,
    originalPrice: 265.0,
    description:
      'Double-breasted weatherproof cotton-gabardine trench coat with storm flap, belted waist, and horn buttons. Perfect topcoat over tailored suits and blazers.',
    category: "men's clothing",
    subcategory: 'Jackets & Outerwear',
    gender: 'Men',
    image:
      'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 110 },
    sizes: ['38R', '40R', '42R', '44R'],
    colors: [
      { name: 'Classic Khaki', hex: '#c2a68c' },
      { name: 'Midnight Navy', hex: '#0f172a' },
    ],
    inStock: true,
    availableQuantity: 40,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 48,
    title: "Men's Heavyweight Organic Cotton French Terry Hoodie",
    price: 82.0,
    originalPrice: 98.0,
    description:
      'Dense 450gsm custom-milled organic French terry sweatshirt with double-lined hood and rib-knit cuffs for elevated casual layering.',
    category: "men's clothing",
    subcategory: 'Sweatshirts & Hoodies',
    gender: 'Men',
    image:
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 195 },
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Heather Gray', hex: '#94a3b8' },
      { name: 'Washed Black', hex: '#27272a' },
    ],
    inStock: true,
    availableQuantity: 65,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 49,
    title: "Men's Selvedge Raw Indigo Denim Jeans",
    price: 125.0,
    originalPrice: 150.0,
    description:
      '13.5oz Japanese shuttle-loom selvedge denim in a clean straight tapered fit. Features copper rivets, chainstitched hem, and button fly.',
    category: "men's clothing",
    subcategory: 'Pants & Trousers',
    gender: 'Men',
    image:
      'https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 140 },
    sizes: ['30x32', '32x32', '34x32', '36x32'],
    colors: [{ name: 'Raw Indigo', hex: '#1e1b4b' }],
    inStock: true,
    availableQuantity: 50,
    featured: false,
    isNewArrival: true,
  },
  {
    id: 50,
    title: "Men's Suede Chelsea Boots",
    price: 155.0,
    originalPrice: 185.0,
    description:
      'Hand-crafted calf suede boots with elastic side gussets, pull tabs, and crepe rubber soles for timeless smart-casual stepping.',
    category: "men's clothing",
    subcategory: 'Footwear & Shoes',
    gender: 'Men',
    image:
      'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 125 },
    sizes: ['8', '9', '10', '11', '12'],
    colors: [
      { name: 'Tobacco Suede', hex: '#78350f' },
      { name: 'Charcoal Suede', hex: '#374151' },
    ],
    inStock: true,
    availableQuantity: 45,
    featured: true,
    isNewArrival: false,
  },
  {
    id: 51,
    title: "Women's 100% Cashmere Turtleneck Sweater",
    price: 165.0,
    originalPrice: 195.0,
    description:
      'Luxuriously soft Grade-A Mongolian cashmere knitted with a relaxed rollneck collar and ribbed trims for effortless cool-weather luxury.',
    category: "women's clothing",
    subcategory: 'Knitwear & Sweaters',
    gender: 'Women',
    image:
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 180 },
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Camel Tan', hex: '#b45309' },
      { name: 'Alabaster White', hex: '#f8fafc' },
    ],
    inStock: true,
    availableQuantity: 55,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 52,
    title: "Women's Tailored Wool Wrap Overcoat",
    price: 240.0,
    originalPrice: 285.0,
    description:
      'Architectural wrap coat made from double-faced virgin wool with exaggerated lapels, tie belt, and deep welt pockets.',
    category: "women's clothing",
    subcategory: 'Jackets & Outerwear',
    gender: 'Women',
    image:
      'https://images.unsplash.com/photo-1539533018447-63fcce667883?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 115 },
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Warm Camel', hex: '#92400e' },
      { name: 'Noir', hex: '#0a0a0a' },
    ],
    inStock: true,
    availableQuantity: 35,
    featured: true,
    isNewArrival: false,
  },
  {
    id: 53,
    title: "Women's Block-Heel Ankle Boots",
    price: 148.0,
    originalPrice: 175.0,
    description:
      'Polished calfskin leather ankle boots featuring a steady 55mm architectural block heel, side zipper, and cushioned insoles.',
    category: "women's clothing",
    subcategory: 'Footwear & Boots',
    gender: 'Women',
    image:
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 135 },
    sizes: ['6', '7', '8', '9', '10'],
    colors: [
      { name: 'Cognac Leather', hex: '#854d0e' },
      { name: 'Black Calfskin', hex: '#18181b' },
    ],
    inStock: true,
    availableQuantity: 40,
    featured: false,
    isNewArrival: true,
  },
  {
    id: 54,
    title: "Women's High-Rise Straight Ankle Jeans",
    price: 88.0,
    originalPrice: 110.0,
    description:
      'Vintage-inspired 100% organic cotton high-rise straight-leg jeans with clean finished hems and classic 5-pocket construction.',
    category: "women's clothing",
    subcategory: 'Pants & Denim',
    gender: 'Women',
    image:
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.6, count: 210 },
    sizes: ['25', '26', '27', '28', '29', '30'],
    colors: [
      { name: 'Medium Vintage Wash', hex: '#3b82f6' },
      { name: 'Washed Black', hex: '#27272a' },
    ],
    inStock: true,
    availableQuantity: 80,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 55,
    title: '14k Gold Herringbone Chain Necklace',
    price: 115.0,
    originalPrice: 140.0,
    description:
      'Sleek liquid-metal herringbone flat snake chain in 14k gold vermeil. Sits smoothly along the collarbone for everyday elegance.',
    category: 'jewelry',
    subcategory: 'Necklaces',
    gender: 'Women',
    image:
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 165 },
    sizes: ['16 inch', '18 inch'],
    colors: [{ name: '14k Yellow Gold', hex: '#eab308' }],
    inStock: true,
    availableQuantity: 60,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 56,
    title: 'Handcrafted Pebble Leather Commuter Tote',
    price: 175.0,
    originalPrice: 210.0,
    description:
      'Spacious everyday shoulder tote crafted in supple pebbled Italian leather with reinforced straps, magnetic snap, and padded laptop slip.',
    category: 'jewelry',
    subcategory: 'Bags & Totes',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 190 },
    sizes: ['One Size'],
    colors: [
      { name: 'Caramel Suede', hex: '#9a3412' },
      { name: 'Onyx Black', hex: '#0f172a' },
    ],
    inStock: true,
    availableQuantity: 45,
    featured: true,
    isNewArrival: false,
  },
  {
    id: 57,
    title: 'Polarized Acetate Square Sunglasses',
    price: 95.0,
    originalPrice: 120.0,
    description:
      'Hand-polished Italian cellulose acetate frames with 100% UV400 polarized mineral glass lenses and durable five-barrel hinges.',
    category: 'jewelry',
    subcategory: 'Eyewear',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 145 },
    sizes: ['One Size'],
    colors: [
      { name: 'Tortoiseshell', hex: '#713f12' },
      { name: 'Gloss Black', hex: '#18181b' },
    ],
    inStock: true,
    availableQuantity: 75,
    featured: false,
    isNewArrival: true,
  },
  {
    id: 58,
    title: 'Unisex Cashmere Fringe Scarf',
    price: 65.0,
    originalPrice: 85.0,
    description:
      'Woven from pure featherlight Himalayan cashmere with delicate fringed ends. Generously sized for styling as a scarf or travel wrap.',
    category: 'jewelry',
    subcategory: 'Scarves & Wraps',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 220 },
    sizes: ['70x200cm'],
    colors: [
      { name: 'Oatmeal Heather', hex: '#e2e8f0' },
      { name: 'Charcoal Melange', hex: '#334155' },
    ],
    inStock: true,
    availableQuantity: 90,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 59,
    title: 'Noise-Cancelling Over-Ear Wireless Headphones',
    price: 199.0,
    originalPrice: 249.0,
    description:
      'Studio-grade dynamic drivers with hybrid active noise cancellation, transparency mode, and 35-hour battery life wrapped in memory foam cushions.',
    category: 'electronics',
    subcategory: 'Audio & Visual',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 310 },
    sizes: ['Over-Ear'],
    colors: [
      { name: 'Matte Silver', hex: '#94a3b8' },
      { name: 'Midnight Black', hex: '#09090b' },
    ],
    inStock: true,
    availableQuantity: 50,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 60,
    title: 'Fast Wireless Charging Stand & Dock',
    price: 45.0,
    originalPrice: 55.0,
    description:
      '3-in-1 weighted aluminum charging station supporting simultaneous fast Qi wireless charging for smartphone, smartwatch, and earbuds.',
    category: 'electronics',
    subcategory: 'Peripherals & Power',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1586816879360-004f5b0c51e5?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.6, count: 180 },
    sizes: ['Standard'],
    colors: [{ name: 'Space Gray', hex: '#334155' }],
    inStock: true,
    availableQuantity: 85,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 61,
    title: 'Portable High-Fidelity Bluetooth Speaker',
    price: 89.0,
    originalPrice: 110.0,
    description:
      'Compact 360-degree acoustic speaker with dual passive radiators, IPX7 waterproof casing, and 16 hours of continuous playtime.',
    category: 'electronics',
    subcategory: 'Audio & Visual',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 240 },
    sizes: ['Portable'],
    colors: [
      { name: 'Forest Green', hex: '#14532d' },
      { name: 'Graphite', hex: '#1e293b' },
    ],
    inStock: true,
    availableQuantity: 60,
    featured: false,
    isNewArrival: true,
  },
  {
    id: 62,
    title: 'French Flax Washed Linen Duvet Cover Set',
    price: 178.0,
    originalPrice: 220.0,
    description:
      'Pre-washed European flax linen duvet set featuring coconut shell button closures and matching pillow shams. Breathable and temperature-regulating.',
    category: 'furniture',
    subcategory: 'Bedding & Linens',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 160 },
    sizes: ['Queen', 'King'],
    colors: [
      { name: 'Clay Sand', hex: '#d6d3d1' },
      { name: 'Misty Blue', hex: '#93c5fd' },
    ],
    inStock: true,
    availableQuantity: 40,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 63,
    title: 'Hand-Poured Soy Wax Scented Candle',
    price: 34.0,
    originalPrice: 42.0,
    description:
      'Artisanal slow-burning soy wax candle with notes of smoked amber, santal, and wild patchouli housed in a reusable ceramic vessel.',
    category: 'furniture',
    subcategory: 'Home Accents',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 275 },
    sizes: ['11 oz'],
    colors: [{ name: 'Matte Terra Cotta', hex: '#9a3412' }],
    inStock: true,
    availableQuantity: 110,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 64,
    title: 'Solid Oak Ergonomic Footrest & Stool',
    price: 65.0,
    originalPrice: 80.0,
    description:
      'Sculpted solid white oak footrest designed to promote active ergonomic posture at desk setups with non-scratch silicone floor pads.',
    category: 'furniture',
    subcategory: 'Office & Workspace',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 130 },
    sizes: ['Standard'],
    colors: [{ name: 'Natural White Oak', hex: '#d4b996' }],
    inStock: true,
    availableQuantity: 50,
    featured: false,
    isNewArrival: true,
  },
  {
    id: 65,
    title: 'Citrus & Basil Neroli Eau de Parfum',
    price: 92.0,
    originalPrice: 115.0,
    description:
      'Vibrant Mediterranean morning fragrance with sun-drenched Calabrian bergamot, crisp crushed basil, and sparkling neroli blossoms.',
    category: 'fragrances',
    subcategory: 'Perfume',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 185 },
    sizes: ['50ml', '100ml'],
    colors: [{ name: 'Clear Flacon', hex: '#fef08a' }],
    inStock: true,
    availableQuantity: 70,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 66,
    title: 'Sandalwood & Cardamom Solid Fragrance',
    price: 42.0,
    originalPrice: 50.0,
    description:
      'Travel-friendly concentrated solid cologne formulated with beeswax, jojoba oil, Mysore sandalwood, and spicy crushed green cardamom.',
    category: 'fragrances',
    subcategory: 'Cologne',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 140 },
    sizes: ['15g Compact'],
    colors: [{ name: 'Brushed Brass Compact', hex: '#ca8a04' }],
    inStock: true,
    availableQuantity: 95,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 67,
    title: 'Antioxidant Vitamin C Brightening Serum',
    price: 44.0,
    originalPrice: 56.0,
    description:
      'Potent 15% ethylated L-ascorbic acid serum with ferulic acid and Kakadu plum to visibly brighten dark spots and protect against oxidative stress.',
    category: 'beauty',
    subcategory: 'Facial Skincare',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 320 },
    sizes: ['30ml Dropper'],
    colors: [{ name: 'Amber Glass Bottle', hex: '#78350f' }],
    inStock: true,
    availableQuantity: 80,
    featured: true,
    isNewArrival: true,
  },
  {
    id: 68,
    title: 'Botanical Nourishing Body Oil',
    price: 38.0,
    originalPrice: 48.0,
    description:
      'Fast-absorbing dry body oil blend of golden jojoba, marula, and meadowfoam seed oils scented with subtle white jasmine and cedar.',
    category: 'beauty',
    subcategory: 'Body Care',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1608248597359-2169b1424d8b?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 195 },
    sizes: ['100ml'],
    colors: [{ name: 'Golden Elixir', hex: '#f59e0b' }],
    inStock: true,
    availableQuantity: 75,
    featured: false,
    isNewArrival: false,
  },
  {
    id: 69,
    title: 'Single-Origin Raw Wildflower Honey',
    price: 19.0,
    originalPrice: 24.0,
    description:
      'Unfiltered raw wildflower honey harvested from coastal apiaries. Rich floral complexity with natural enzyme potency.',
    category: 'groceries',
    subcategory: 'Gourmet Pantry',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 260 },
    sizes: ['350g Jar'],
    colors: [{ name: 'Golden Amber Jar', hex: '#d97706' }],
    inStock: true,
    availableQuantity: 130,
    featured: false,
    isNewArrival: true,
  },
  {
    id: 70,
    title: 'Aged Modena Balsamic Vinegar 12-Year',
    price: 36.0,
    originalPrice: 45.0,
    description:
      'Traditional dense IGP balsamic vinegar aged in seasoned oak and chestnut barrels. Decadent pairing with Sicilian Olive Oil.',
    category: 'groceries',
    subcategory: 'Gourmet Pantry',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 175 },
    sizes: ['250ml Bottle'],
    colors: [{ name: 'Dark Flacon', hex: '#0f172a' }],
    inStock: true,
    availableQuantity: 65,
    featured: true,
    isNewArrival: false,
  },
  {
    id: 71,
    title: 'Artisanal Single-Estate Matcha Powder',
    price: 29.0,
    originalPrice: 36.0,
    description:
      'Ceremonial grade stone-ground Uji matcha from first-harvest shade-grown tencha leaves. Vibrant jade color with sweet umami notes.',
    category: 'groceries',
    subcategory: 'Artisanal Teas',
    gender: 'Unisex',
    image:
      'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 210 },
    sizes: ['30g Tin'],
    colors: [{ name: 'Matte Black Tin', hex: '#18181b' }],
    inStock: true,
    availableQuantity: 90,
    featured: false,
    isNewArrival: true,
  },
  ...ADDITIONAL_PRODUCTS,
];

// Helper to build category hierarchies required by Vertex AI Search for Retail
function getCategoryHierarchy(category, subcategory) {
  if (category === "men's clothing") {
    return [
      'Apparel',
      "Apparel > Men's Clothing",
      subcategory ? `Apparel > Men's Clothing > ${subcategory}` : "Apparel > Men's Clothing",
    ];
  }
  if (category === "women's clothing") {
    return [
      'Apparel',
      "Apparel > Women's Clothing",
      subcategory ? `Apparel > Women's Clothing > ${subcategory}` : "Apparel > Women's Clothing",
    ];
  }
  if (category === 'jewelry') {
    return [
      'Accessories',
      'Accessories > Fine Jewelry',
      subcategory ? `Accessories > Fine Jewelry > ${subcategory}` : 'Accessories > Fine Jewelry',
    ];
  }
  if (category === 'electronics') {
    return [
      'Electronics',
      subcategory ? `Electronics > ${subcategory}` : 'Electronics > Audio & Visual',
    ];
  }
  if (category === 'furniture') {
    return [
      'Home & Living',
      subcategory ? `Home & Living > ${subcategory}` : 'Home & Living > Furniture',
    ];
  }
  if (category === 'fragrances') {
    return [
      'Beauty & Fragrance',
      'Beauty & Fragrance > Fragrances',
      subcategory
        ? `Beauty & Fragrance > Fragrances > ${subcategory}`
        : 'Beauty & Fragrance > Fragrances',
    ];
  }
  if (category === 'beauty') {
    return [
      'Beauty & Fragrance',
      'Beauty & Fragrance > Skincare',
      subcategory
        ? `Beauty & Fragrance > Skincare > ${subcategory}`
        : 'Beauty & Fragrance > Skincare',
    ];
  }
  if (category === 'groceries') {
    return [
      'Gourmet Pantry',
      subcategory ? `Gourmet Pantry > ${subcategory}` : 'Gourmet Pantry > Specialty Foods',
    ];
  }
  return ['General Merchandise'];
}

// Convert product to Google Cloud Vertex AI Search for Retail Product resource schema
function transformToVertexProduct(item) {
  const categories = getCategoryHierarchy(item.category, item.subcategory);
  const colorNames = item.colors.map((c) => c.name);
  const colorHexes = item.colors.map((c) => c.hex);

  const normalizeTag = (value) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  const tags = [item.gender, item.category, item.subcategory, ...(item.searchTags || [])]
    .filter(Boolean)
    .map(normalizeTag);

  const attributes = {
    sizes: {
      text: item.sizes,
    },
    colors: {
      text: colorNames,
    },
    color_hexes: {
      text: colorHexes,
    },
    gender: {
      text: [item.gender],
    },
    subcategory: {
      text: [item.subcategory || 'General'],
    },
    product_type: {
      text: [item.productType || item.subcategory || 'General'],
    },
    featured: {
      text: [String(item.featured)],
    },
    is_new_arrival: {
      text: [String(item.isNewArrival)],
    },
  };
  if (item.useCases?.length) attributes.use_case = { text: item.useCases };
  if (item.keyFeatures?.length) attributes.key_features = { text: item.keyFeatures };

  return {
    id: `onx-${item.id}`,
    type: 'PRIMARY',
    title: item.title,
    description: item.description,
    languageCode: 'en-US',
    categories,
    brands: ['ONIX WARES'],
    uri: `https://onixwares.com/products/${item.id}`,
    images: [
      {
        uri: item.image,
      },
    ],
    priceInfo: {
      currencyCode: 'USD',
      price: item.price,
      ...(item.originalPrice > item.price ? { originalPrice: item.originalPrice } : {}),
    },
    rating: {
      averageRating: item.rating.rate,
      ratingCount: item.rating.count,
    },
    availability: item.inStock ? 'IN_STOCK' : 'OUT_OF_STOCK',
    availableQuantity: item.availableQuantity || 50,
    conditions: ['new'],
    colorInfo: {
      colors: colorNames,
    },
    sizes: item.sizes,
    tags: Array.from(new Set(tags)),
    attributes,
  };
}

export function generateVertexCatalog() {
  const vertexProducts = ONIX_PRODUCTS.map(transformToVertexProduct);

  // Write JSONL (one compact JSON per line, required by Google Cloud Retail API)
  const jsonlContent = vertexProducts.map((p) => JSON.stringify(p)).join('\n');
  const jsonlPath = path.resolve(rootDir, 'vertex-retail-catalog.jsonl');
  fs.writeFileSync(jsonlPath, jsonlContent, 'utf-8');

  // Write formatted JSON (for easy viewing, debugging, and mock testing)
  const prettyJsonPath = path.resolve(rootDir, 'vertex-retail-catalog.json');
  fs.writeFileSync(prettyJsonPath, JSON.stringify(vertexProducts, null, 2), 'utf-8');

  console.log(`✅ Vertex AI Commerce Search catalog generated successfully!`);
  console.log(`   - JSONL format: ${jsonlPath} (${vertexProducts.length} items)`);
  console.log(`   - JSON format:  ${prettyJsonPath}`);

  return { vertexProducts, jsonlPath, prettyJsonPath };
}

// Execute when run directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateVertexCatalog();
}
