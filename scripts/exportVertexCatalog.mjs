import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Curated catalog based on Onix Apparel products with normalized CDN images
const ONIX_PRODUCTS = [
  {
    id: 1,
    title: "Fjallraven - Foldsack No. 1 Backpack, Fits 15 Laptops",
    price: 109.95,
    originalPrice: 129.95,
    description: "Your perfect pack for everyday use and walks in the forest. Stash your laptop (up to 15 inches) in the padded sleeve, your everyday gear in the main compartment, and small items in the zip-close pocket.",
    category: "men's clothing",
    image: "https://m.media-amazon.com/images/I/81fPKd-2AYL._AC_SL1500.jpg",
    rating: { rate: 3.9, count: 120 },
    sizes: ["One Size"],
    colors: [
      { name: "Olive Green", hex: "#4f5d47" },
      { name: "Deep Navy", hex: "#1e3a5f" },
      { name: "Oxblood Red", hex: "#722f37" }
    ],
    inStock: true,
    availableQuantity: 45,
    featured: true,
    isNewArrival: false,
    subcategory: "Bags & Backpacks",
    gender: "Unisex"
  },
  {
    id: 2,
    title: "Mens Casual Premium Slim Fit T-Shirts",
    price: 22.30,
    originalPrice: 29.99,
    description: "Slim-fitting style, contrast raglan long sleeve, three-button henley placket, light weight & soft fabric for breathable and comfortable wearing. Solid stitched shirts with round neck made for durability.",
    category: "men's clothing",
    image: "https://m.media-amazon.com/images/I/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY.jpg",
    rating: { rate: 4.1, count: 259 },
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Onyx Black", hex: "#1c1917" },
      { name: "Heather Grey", hex: "#64748b" },
      { name: "Navy Blue", hex: "#1e3a5f" }
    ],
    inStock: true,
    availableQuantity: 120,
    featured: true,
    isNewArrival: true,
    subcategory: "Shirts & Henley",
    gender: "Men"
  },
  {
    id: 3,
    title: "Mens Cotton Jacket",
    price: 55.99,
    originalPrice: 79.99,
    description: "Great outerwear jackets for Spring/Autumn/Winter, suitable for many occasions such as working, hiking, camping, mountain/rock climbing, cycling, traveling or other outdoors. Good gift choice for you or your family member.",
    category: "men's clothing",
    image: "https://m.media-amazon.com/images/I/71li-ujtlUL._AC_UX679.jpg",
    rating: { rate: 4.7, count: 500 },
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Khaki Stone", hex: "#c2b280" },
      { name: "Midnight Black", hex: "#18181b" },
      { name: "Army Olive", hex: "#3d4b3c" }
    ],
    inStock: true,
    availableQuantity: 65,
    featured: true,
    isNewArrival: false,
    subcategory: "Jackets & Outerwear",
    gender: "Men"
  },
  {
    id: 4,
    title: "Mens Casual Slim Fit",
    price: 15.99,
    originalPrice: 19.99,
    description: "The color could be slightly different between on the screen and in practice. Please note that body builds vary by person, therefore, detailed size information should be reviewed below on the product description.",
    category: "men's clothing",
    image: "https://m.media-amazon.com/images/I/71YXzeOuslL._AC_UY879.jpg",
    rating: { rate: 2.1, count: 430 },
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Onyx Black", hex: "#1c1917" },
      { name: "Heather Grey", hex: "#64748b" },
      { name: "Warm Cream", hex: "#f5efe6" }
    ],
    inStock: true,
    availableQuantity: 80,
    featured: false,
    isNewArrival: false,
    subcategory: "Casual Tees",
    gender: "Men"
  },
  {
    id: 5,
    title: "John Hardy Women's Legends Naga Gold & Silver Dragon Station Chain Bracelet",
    price: 695.00,
    originalPrice: 750.00,
    description: "From our Legends Collection, the Naga was inspired by the mythical water dragon that protects the ocean's pearl. Wear facing inward to be bestowed with love and abundance, or outward for protection.",
    category: "jewelery",
    image: "https://m.media-amazon.com/images/I/71pWzhdJNwL._AC_UL640_QL65_ML3.jpg",
    rating: { rate: 4.6, count: 400 },
    sizes: ["One Size"],
    colors: [
      { name: "Sterling Silver", hex: "#d1d5db" },
      { name: "18K Gold", hex: "#eab308" }
    ],
    inStock: true,
    availableQuantity: 15,
    featured: true,
    isNewArrival: true,
    subcategory: "Bracelets",
    gender: "Women"
  },
  {
    id: 6,
    title: "Solid Gold Petite Micropave Diamond Ring",
    price: 168.00,
    originalPrice: 210.00,
    description: "Satisfaction Guaranteed. Return or exchange any order within 30 days. Designed and handcrafted in fine gold with glistening pavé stones for subtle everyday brilliance.",
    category: "jewelery",
    image: "https://m.media-amazon.com/images/I/61sbMiUnoGL._AC_UL640_QL65_ML3.jpg",
    rating: { rate: 3.9, count: 70 },
    sizes: ["Size 6", "Size 7", "Size 8"],
    colors: [
      { name: "Rose Gold", hex: "#fb7185" },
      { name: "Yellow Gold", hex: "#eab308" },
      { name: "White Gold", hex: "#e2e8f0" }
    ],
    inStock: true,
    availableQuantity: 28,
    featured: false,
    isNewArrival: false,
    subcategory: "Rings",
    gender: "Women"
  },
  {
    id: 7,
    title: "White Gold Plated Princess Solitaire Diamond Engagement Ring",
    price: 9.99,
    originalPrice: 15.99,
    description: "Classic Created Wedding Engagement Solitaire Diamond Promise Ring for Her. Gifts to spoil your love more for Engagement, Wedding, Anniversary, Valentine's Day...",
    category: "jewelery",
    image: "https://m.media-amazon.com/images/I/71YAIFU48IL._AC_UL640_QL65_ML3.jpg",
    rating: { rate: 3.0, count: 400 },
    sizes: ["Size 6", "Size 7", "Size 8"],
    colors: [
      { name: "Silver Rhodium", hex: "#cbd5e1" }
    ],
    inStock: true,
    availableQuantity: 95,
    featured: false,
    isNewArrival: true,
    subcategory: "Rings",
    gender: "Women"
  },
  {
    id: 8,
    title: "Pierced Owl Rose Gold Plated Stainless Steel Flared Tunnel Plug Earrings",
    price: 10.99,
    originalPrice: 14.99,
    description: "Rose Gold Plated Flared Tunnel Plug Earrings. Made of 316L Surgical Grade Stainless Steel, polished smooth for comfortable daily wear.",
    category: "jewelery",
    image: "https://m.media-amazon.com/images/I/51UDEzMJVpL._AC_UL640_QL65_ML3.jpg",
    rating: { rate: 1.9, count: 100 },
    sizes: ["One Size"],
    colors: [
      { name: "Rose Gold", hex: "#fb7185" },
      { name: "Metallic Gold", hex: "#eab308" }
    ],
    inStock: true,
    availableQuantity: 50,
    featured: false,
    isNewArrival: false,
    subcategory: "Earrings",
    gender: "Unisex"
  },
  {
    id: 15,
    title: "BIYLACLESEN Women's 3-in-1 Snowboard Jacket Winter Coat",
    price: 56.99,
    originalPrice: 79.99,
    description: "Note: The Jackets is US standard size, Please choose size as your usual wear. Material: 100% Polyester; Detachable Liner Fabric: Warm Fleece. Stand collar, liner with front full zip closure and side zipped pockets.",
    category: "women's clothing",
    image: "https://m.media-amazon.com/images/I/51Y5NI-I5jL._AC_UX679.jpg",
    rating: { rate: 2.6, count: 235 },
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Crimson Red", hex: "#b91c1c" },
      { name: "Onyx Black", hex: "#1c1917" },
      { name: "Royal Purple", hex: "#7e22ce" }
    ],
    inStock: true,
    availableQuantity: 40,
    featured: false,
    isNewArrival: true,
    subcategory: "Jackets & Outerwear",
    gender: "Women"
  },
  {
    id: 16,
    title: "Lock and Love Women's Removable Hooded Faux Leather Moto Biker Jacket",
    price: 29.95,
    originalPrice: 42.00,
    description: "100% POLYURETHANE (shell) 100% POLYESTER (lining). Faux leather material for style and comfort / 2 pockets of front, 2-For-One Hooded denim style faux leather jacket, Button detail on waist / Detail stitching at sides.",
    category: "women's clothing",
    image: "https://m.media-amazon.com/images/I/81XH0e8fefL._AC_UY879.jpg",
    rating: { rate: 2.9, count: 340 },
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Caramel Brown", hex: "#92400e" },
      { name: "Jet Black", hex: "#09090b" },
      { name: "Cognac", hex: "#78350f" }
    ],
    inStock: true,
    availableQuantity: 55,
    featured: true,
    isNewArrival: false,
    subcategory: "Jackets & Outerwear",
    gender: "Women"
  },
  {
    id: 17,
    title: "Rain Jacket Women Windbreaker Striped Climbing Raincoats",
    price: 39.99,
    originalPrice: 49.99,
    description: "Lightweight perfect for casual or outdoor sports like climbing, running, cycling, camping, hiking, picnic, walking, etc. Waterproof breathable fabric with striped lining for an elegant nautical touch.",
    category: "women's clothing",
    image: "https://m.media-amazon.com/images/I/71HblAHs5xL._AC_UY879_-2t.jpg",
    rating: { rate: 3.8, count: 679 },
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Canary Yellow", hex: "#f0c042" },
      { name: "Striped Navy", hex: "#1e3a5f" },
      { name: "Powder Blue", hex: "#87a7b8" }
    ],
    inStock: true,
    availableQuantity: 60,
    featured: false,
    isNewArrival: true,
    subcategory: "Jackets & Rainwear",
    gender: "Women"
  },
  {
    id: 18,
    title: "MBJ Women's Solid Short Sleeve Boat Neck V-Neck",
    price: 9.85,
    originalPrice: 14.50,
    description: "95% RAYON 5% SPANDEX, Made in USA or Imported, Do Not Bleach, Lightweight fabric with great stretch for comfort, Ribbed on sleeves and neckline / Double stitching on bottom hem.",
    category: "women's clothing",
    image: "https://m.media-amazon.com/images/I/71z3kpMAYsL._AC_UY879.jpg",
    rating: { rate: 4.7, count: 130 },
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Onyx Black", hex: "#1c1917" },
      { name: "Heather Grey", hex: "#64748b" },
      { name: "Warm Cream", hex: "#f5efe6" }
    ],
    inStock: true,
    availableQuantity: 110,
    featured: true,
    isNewArrival: false,
    subcategory: "Tops & Tees",
    gender: "Women"
  },
  {
    id: 19,
    title: "Opna Women's Short Sleeve Moisture Wicking Athletic T-Shirt",
    price: 7.95,
    originalPrice: 11.99,
    description: "100% Polyester, Machine wash, 100% cationic polyester interlock, Machine Wash & Pre Shrunk for a Great Fit, Lightweight, roomy and highly breathable with moisture wicking fabric which helps to keep moisture away.",
    category: "women's clothing",
    image: "https://m.media-amazon.com/images/I/51eg55uWmdL._AC_UX679.jpg",
    rating: { rate: 4.5, count: 146 },
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Midnight Black", hex: "#18181b" },
      { name: "Coral Pink", hex: "#f43f5e" },
      { name: "Teal Green", hex: "#0d9488" }
    ],
    inStock: true,
    availableQuantity: 150,
    featured: false,
    isNewArrival: false,
    subcategory: "Activewear & Tees",
    gender: "Women"
  },
  {
    id: 20,
    title: "DANVOUY Womens Casual V Neck Pleated Casual Tee T-Shirt",
    price: 12.99,
    originalPrice: 18.00,
    description: "95%Cotton,5%Spandex, Features: Casual, Short Sleeve, Letter Print,V-Neck,Fashion Tees, The fabric is soft and has some stretch., Occasion: Casual/Office/Beach/School/Home/Street. Season: Spring,Summer,Autumn,Winter.",
    category: "women's clothing",
    image: "https://m.media-amazon.com/images/I/61pHAEJ4NML._AC_UX679.jpg",
    rating: { rate: 3.6, count: 145 },
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Onyx Black", hex: "#1c1917" },
      { name: "Heather Grey", hex: "#64748b" },
      { name: "Navy Blue", hex: "#1e3a5f" }
    ],
    inStock: true,
    availableQuantity: 90,
    featured: false,
    isNewArrival: false,
    subcategory: "Tops & Tees",
    gender: "Women"
  }
];

// Helper to build category hierarchies required by Vertex AI Search for Retail
function getCategoryHierarchy(category, subcategory) {
  if (category === "men's clothing") {
    return [
      "Apparel",
      "Apparel > Men's Clothing",
      subcategory ? `Apparel > Men's Clothing > ${subcategory}` : "Apparel > Men's Clothing"
    ];
  }
  if (category === "women's clothing") {
    return [
      "Apparel",
      "Apparel > Women's Clothing",
      subcategory ? `Apparel > Women's Clothing > ${subcategory}` : "Apparel > Women's Clothing"
    ];
  }
  if (category === "jewelery") {
    return [
      "Accessories",
      "Accessories > Fine Jewelry",
      subcategory ? `Accessories > Fine Jewelry > ${subcategory}` : "Accessories > Fine Jewelry"
    ];
  }
  return ["Apparel"];
}

// Convert product to Google Cloud Vertex AI Search for Retail Product resource schema
function transformToVertexProduct(item) {
  const categories = getCategoryHierarchy(item.category, item.subcategory);
  const colorNames = item.colors.map(c => c.name);
  const colorHexes = item.colors.map(c => c.hex);

  // Extract relevant keywords for tags
  const tags = [
    item.gender.toLowerCase(),
    item.category.replace(/[^a-zA-Z]/g, '').toLowerCase(),
    ...(item.subcategory ? item.subcategory.toLowerCase().split(/[ &]+/) : [])
  ].filter(Boolean);

  return {
    id: `onx-${item.id}`,
    type: "PRIMARY",
    title: item.title,
    description: item.description,
    categories: categories,
    brands: ["ONIX APPAREL"],
    uri: `https://onixapparel.com/products/${item.id}`,
    images: [
      {
        uri: item.image,
        height: 800,
        width: 800
      }
    ],
    priceInfo: {
      currencyCode: "USD",
      price: item.price,
      originalPrice: item.originalPrice || item.price,
      cost: Number((item.price * 0.45).toFixed(2))
    },
    availability: item.inStock ? "IN_STOCK" : "OUT_OF_STOCK",
    availableQuantity: item.availableQuantity || 50,
    tags: Array.from(new Set(tags)),
    attributes: {
      sizes: {
        text: item.sizes
      },
      colors: {
        text: colorNames
      },
      color_hexes: {
        text: colorHexes
      },
      gender: {
        text: [item.gender]
      },
      subcategory: {
        text: [item.subcategory || "General"]
      },
      featured: {
        text: [String(item.featured)]
      },
      is_new_arrival: {
        text: [String(item.isNewArrival)]
      },
      rating_rate: {
        numbers: [item.rating.rate]
      },
      rating_count: {
        numbers: [item.rating.count]
      }
    }
  };
}

export function generateVertexCatalog() {
  const vertexProducts = ONIX_PRODUCTS.map(transformToVertexProduct);

  // Write JSONL (one compact JSON per line, required by Google Cloud Retail API)
  const jsonlContent = vertexProducts.map(p => JSON.stringify(p)).join('\n');
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
generateVertexCatalog();
