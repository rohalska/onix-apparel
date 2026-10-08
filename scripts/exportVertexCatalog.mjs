import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Curated catalog based on Onix Wares products with normalized CDN images
const ONIX_PRODUCTS = [
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
    category: 'jewelery',
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
    category: 'jewelery',
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
    category: 'jewelery',
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
    category: 'jewelery',
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
  if (category === 'jewelery') {
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

  // Extract relevant keywords for tags
  const tags = [
    item.gender.toLowerCase(),
    item.category.replace(/[^a-zA-Z]/g, '').toLowerCase(),
    ...(item.subcategory ? item.subcategory.toLowerCase().split(/[ &]+/) : []),
  ].filter(Boolean);

  return {
    id: `onx-${item.id}`,
    type: 'PRIMARY',
    title: item.title,
    description: item.description,
    categories: categories,
    brands: ['ONIX WARES'],
    uri: `https://onixwares.com/products/${item.id}`,
    images: [
      {
        uri: item.image,
        height: 800,
        width: 800,
      },
    ],
    priceInfo: {
      currencyCode: 'USD',
      price: item.price,
      originalPrice: item.originalPrice || item.price,
      cost: Number((item.price * 0.45).toFixed(2)),
    },
    availability: item.inStock ? 'IN_STOCK' : 'OUT_OF_STOCK',
    availableQuantity: item.availableQuantity || 50,
    tags: Array.from(new Set(tags)),
    attributes: {
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
      featured: {
        text: [String(item.featured)],
      },
      is_new_arrival: {
        text: [String(item.isNewArrival)],
      },
      rating_rate: {
        numbers: [item.rating.rate],
      },
      rating_count: {
        numbers: [item.rating.count],
      },
    },
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
