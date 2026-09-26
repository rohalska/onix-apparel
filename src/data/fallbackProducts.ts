import { Product } from '../types/product';

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const MEN_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const ACCESSORY_SIZES = ['One Size'];

const CLOTHING_COLORS = [
  { name: 'Onyx Black', hex: '#1c1917' },
  { name: 'Heather Grey', hex: '#64748b' },
  { name: 'Navy Blue', hex: '#1e3a5f' },
  { name: 'Warm Cream', hex: '#f5efe6' },
  { name: 'Forest Green', hex: '#2d4a3e' }
];

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 1,
    title: "Fjallraven - Foldsack No. 1 Backpack, Fits 15 Laptops",
    price: 109.95,
    description: "Your perfect pack for everyday use and walks in the forest. Stash your laptop (up to 15 inches) in the padded sleeve, your everyday gear in the main compartment, and small items in the zip-close pocket.",
    category: "men's clothing",
    image: "https://m.media-amazon.com/images/I/81fPKd-2AYL._AC_SL1500.jpg",
    rating: { rate: 3.9, count: 120 },
    sizes: ACCESSORY_SIZES,
    colors: [
      { name: 'Olive Green', hex: '#4f5d47' },
      { name: 'Deep Navy', hex: '#1e3a5f' },
      { name: 'Oxblood Red', hex: '#722f37' }
    ],
    inStock: true,
    featured: true,
    isNewArrival: false
  },
  {
    id: 2,
    title: "Mens Casual Premium Slim Fit T-Shirts",
    price: 22.3,
    description: "Slim-fitting style, contrast raglan long sleeve, three-button henley placket, light weight & soft fabric for breathable and comfortable wearing. Solid stitched shirts with round neck made for durability.",
    category: "men's clothing",
    image: "https://m.media-amazon.com/images/I/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY.jpg",
    rating: { rate: 4.1, count: 259 },
    sizes: MEN_SIZES,
    colors: CLOTHING_COLORS,
    inStock: true,
    featured: true,
    isNewArrival: true
  },
  {
    id: 3,
    title: "Mens Cotton Jacket",
    price: 55.99,
    description: "Great outerwear jackets for Spring/Autumn/Winter, suitable for many occasions such as working, hiking, camping, mountain/rock climbing, cycling, traveling or other outdoors. Good gift choice for you or your family member.",
    category: "men's clothing",
    image: "https://m.media-amazon.com/images/I/71li-ujtlUL._AC_UX679.jpg",
    rating: { rate: 4.7, count: 500 },
    sizes: MEN_SIZES,
    colors: [
      { name: 'Khaki Stone', hex: '#c2b280' },
      { name: 'Midnight Black', hex: '#18181b' },
      { name: 'Army Olive', hex: '#3d4b3c' }
    ],
    inStock: true,
    featured: true,
    isNewArrival: false
  },
  {
    id: 4,
    title: "Mens Casual Slim Fit",
    price: 15.99,
    description: "The color could be slightly different between on the screen and in practice. Please note that body builds vary by person, therefore, detailed size information should be reviewed below on the product description.",
    category: "men's clothing",
    image: "https://m.media-amazon.com/images/I/71YXzeOuslL._AC_UY879.jpg",
    rating: { rate: 2.1, count: 430 },
    sizes: MEN_SIZES,
    colors: CLOTHING_COLORS,
    inStock: true,
    featured: false,
    isNewArrival: false,
    onSale: true,
    originalPrice: 24.99,
    discountPercent: 36
  },
  {
    id: 15,
    title: "BIYLACLESEN Women's 3-in-1 Snowboard Jacket Winter Coats",
    price: 56.99,
    description: "Note: The Jackets is US standard size, Please choose size as your usual wear. Material: 100% Polyester; Detachable Liner Fabric: Warm Fleece. Stand collar, liner with front full zip closure and side zipped pockets.",
    category: "women's clothing",
    image: "https://m.media-amazon.com/images/I/51Y5NI-I5jL._AC_UX679.jpg",
    rating: { rate: 2.6, count: 235 },
    sizes: DEFAULT_SIZES,
    colors: [
      { name: 'Lavender Violet', hex: '#8a6ea8' },
      { name: 'Teal Lake', hex: '#266472' },
      { name: 'Jet Black', hex: '#18181b' }
    ],
    inStock: true,
    featured: true,
    isNewArrival: true
  },
  {
    id: 16,
    title: "Lock and Love Women's Removable Hooded Faux Leather Moto Biker Jacket",
    price: 29.95,
    description: "100% POLYURETHANE (shell) 100% POLYESTER (lining). Faux leather material for style and comfort / 2 pockets of front, 2-For-One Hooded denim style faux leather jacket, Button detail on waist / Detail stitching at sides.",
    category: "women's clothing",
    image: "https://m.media-amazon.com/images/I/81XH0e8fefL._AC_UY879.jpg",
    rating: { rate: 2.9, count: 340 },
    sizes: DEFAULT_SIZES,
    colors: [
      { name: 'Rich Espresso', hex: '#3b2f2f' },
      { name: 'Charcoal Black', hex: '#222222' },
      { name: 'Burgundy Wine', hex: '#581825' }
    ],
    inStock: true,
    featured: true,
    isNewArrival: false,
    onSale: true,
    originalPrice: 49.95,
    discountPercent: 40
  },
  {
    id: 17,
    title: "Rain Jacket Women Windbreaker Striped Climbing Raincoats",
    price: 39.99,
    description: "Lightweight perfect for casual or outdoor sports like climbing, running, cycling, camping, hiking, picnic, walking, etc. Waterproof breathable fabric with striped lining for an elegant nautical touch.",
    category: "women's clothing",
    image: "https://m.media-amazon.com/images/I/71HblAHs5xL._AC_UY879_-2t.jpg",
    rating: { rate: 3.8, count: 679 },
    sizes: DEFAULT_SIZES,
    colors: [
      { name: 'Canary Yellow', hex: '#f0c042' },
      { name: 'Striped Navy', hex: '#1e3a5f' },
      { name: 'Powder Blue', hex: '#87a7b8' }
    ],
    inStock: true,
    featured: false,
    isNewArrival: true
  },
  {
    id: 18,
    title: "MBJ Women's Solid Short Sleeve Boat Neck V-Neck",
    price: 9.85,
    description: "95% RAYON 5% SPANDEX, Made in USA or Imported, Do Not Bleach, Lightweight fabric with great stretch for comfort, Ribbed on sleeves and neckline / Double stitching on bottom hem.",
    category: "women's clothing",
    image: "https://m.media-amazon.com/images/I/71z3kpMAYsL._AC_UY879.jpg",
    rating: { rate: 4.7, count: 130 },
    sizes: DEFAULT_SIZES,
    colors: CLOTHING_COLORS,
    inStock: true,
    featured: true,
    isNewArrival: false,
    onSale: true,
    originalPrice: 16.50,
    discountPercent: 40
  },
  {
    id: 19,
    title: "Opna Women's Short Sleeve Moisture",
    price: 7.95,
    description: "100% Polyester, Machine wash, 100% cationic polyester interlock, Machine Wash & Pre Shrunk for a Great Fit, Lightweight, roomy and highly breathable with moisture wicking fabric which helps to keep moisture away.",
    category: "women's clothing",
    image: "https://m.media-amazon.com/images/I/51eg55uWmdL._AC_UX679.jpg",
    rating: { rate: 4.5, count: 146 },
    sizes: DEFAULT_SIZES,
    colors: [
      { name: 'Coral Pink', hex: '#ea6969' },
      { name: 'Turquoise', hex: '#40b5ad' },
      { name: 'Pure White', hex: '#f8fafc' }
    ],
    inStock: true,
    featured: false,
    isNewArrival: false
  },
  {
    id: 20,
    title: "DANVOUY Womens T Shirt Casual Cotton Short",
    price: 12.99,
    description: "95%Cotton,5%Spandex, Features: Casual, Short Sleeve, Letter Print,V-Neck,Fashion Tees, The fabric is soft and has some stretch., Occasion: Casual/Office/Beach/School/Home/Street. Season: Spring,Summer,Autumn,Winter.",
    category: "women's clothing",
    image: "https://m.media-amazon.com/images/I/61pHAEJ4NML._AC_UX679.jpg",
    rating: { rate: 3.6, count: 145 },
    sizes: DEFAULT_SIZES,
    colors: CLOTHING_COLORS,
    inStock: true,
    featured: false,
    isNewArrival: true
  },
  {
    id: 5,
    title: "John Hardy Men's Legends Naga Gold & Silver Dragon Station Chain Bracelet",
    price: 695,
    description: "From our Legends Collection, the Naga was inspired by the mythical water dragon that protects the ocean's pearl. Wear facing inward to be bestowed with love and abundance, or outward for protection.",
    category: "jewelery",
    image: "https://m.media-amazon.com/images/I/71pWzhdJNwL._AC_UL640_QL65_ML3.jpg",
    rating: { rate: 4.6, count: 400 },
    sizes: ACCESSORY_SIZES,
    colors: [
      { name: 'Sterling Silver & Gold', hex: '#d4af37' }
    ],
    inStock: true,
    featured: true,
    isNewArrival: false
  },
  {
    id: 6,
    title: "Solid Gold Petite Micropave",
    price: 168,
    description: "Satisfaction Guaranteed. Return or exchange any order within 30 days. Designed and handcrafted in fine gold with glistening pavé stones for subtle everyday brilliance.",
    category: "jewelery",
    image: "https://m.media-amazon.com/images/I/61sbMiUnoGL._AC_UL640_QL65_ML3.jpg",
    rating: { rate: 3.9, count: 70 },
    sizes: ['Size 6', 'Size 7', 'Size 8'],
    colors: [
      { name: '14k Yellow Gold', hex: '#ffd700' },
      { name: 'Rose Gold', hex: '#b76e79' },
      { name: 'White Gold', hex: '#e5e7eb' }
    ],
    inStock: true,
    featured: false,
    isNewArrival: true
  },
  {
    id: 7,
    title: "White Gold Plated Princess",
    price: 9.99,
    description: "Classic Created Wedding Engagement Solitaire Diamond Promise Ring for Her. Gifts to spoil your love more for Engagement, Wedding, Anniversary, Valentine's Day...",
    category: "jewelery",
    image: "https://m.media-amazon.com/images/I/71YAIFU48IL._AC_UL640_QL65_ML3.jpg",
    rating: { rate: 3, count: 400 },
    sizes: ['Size 6', 'Size 7', 'Size 8'],
    colors: [
      { name: 'Platinum Finish', hex: '#e2e8f0' }
    ],
    inStock: true,
    featured: false,
    isNewArrival: false,
    onSale: true,
    originalPrice: 19.99,
    discountPercent: 50
  },
  {
    id: 8,
    title: "Pierced Owl Rose Gold Plated Stainless Steel Double",
    price: 10.99,
    description: "Rose Gold Plated Flared Tunnel Plug Earrings. Made of 316L Surgical Grade Stainless Steel, polished smooth for comfortable daily wear.",
    category: "jewelery",
    image: "https://m.media-amazon.com/images/I/51UDEzMJVpL._AC_UL640_QL65_ML3.jpg",
    rating: { rate: 1.9, count: 100 },
    sizes: ACCESSORY_SIZES,
    colors: [
      { name: 'Rose Gold', hex: '#b76e79' }
    ],
    inStock: true,
    featured: false,
    isNewArrival: false,
    onSale: true,
    originalPrice: 18.00,
    discountPercent: 39
  }
];
