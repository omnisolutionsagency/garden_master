// ============================================================
// THEME
// ============================================================
export const COLORS = {
  // Earth-toned palette
  primary: '#2D5A3D',      // forest green
  primaryLight: '#4A8C5C',
  primaryDark: '#1A3D28',
  accent: '#E8A838',        // warm amber
  accentLight: '#F5C96B',
  background: '#F7F4EE',    // warm cream
  surface: '#FFFFFF',
  surfaceAlt: '#EDE8DF',
  text: '#1C1C1E',
  textSecondary: '#6B6B6B',
  textLight: '#FFFFFF',
  error: '#C44B4B',
  warning: '#E8A838',
  success: '#4A8C5C',
  info: '#4A7FB5',
  border: '#D4CFC6',
  shadow: '#00000015',
  // Status colors
  waterBlue: '#5B9BD5',
  fertilizerBrown: '#8B6914',
  rainGray: '#7C8A96',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT = {
  regular: 'System',
  bold: 'System',
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    title: 28,
  },
};

// ============================================================
// PLANT PRESETS (common herbs & vegetables)
// ============================================================
export interface PlantPreset {
  name: string;
  category: 'herb' | 'vegetable' | 'fruit' | 'flower';
  icon: string;
  defaultWaterGallons: number; // per plant per watering
  defaultFrequencyDays: number;
  commonVarieties: string[];
}

export const PLANT_PRESETS: PlantPreset[] = [
  // Herbs
  { name: 'Basil', category: 'herb', icon: '🌿', defaultWaterGallons: 0.25, defaultFrequencyDays: 2, commonVarieties: ['Sweet', 'Thai', 'Purple', 'Genovese', 'Lemon'] },
  { name: 'Cilantro', category: 'herb', icon: '🌿', defaultWaterGallons: 0.2, defaultFrequencyDays: 2, commonVarieties: ['Santo', 'Calypso', 'Slow Bolt'] },
  { name: 'Mint', category: 'herb', icon: '🌿', defaultWaterGallons: 0.3, defaultFrequencyDays: 1, commonVarieties: ['Spearmint', 'Peppermint', 'Chocolate', 'Mojito'] },
  { name: 'Rosemary', category: 'herb', icon: '🌿', defaultWaterGallons: 0.15, defaultFrequencyDays: 5, commonVarieties: ['Tuscan Blue', 'Prostrate', 'Arp'] },
  { name: 'Thyme', category: 'herb', icon: '🌿', defaultWaterGallons: 0.1, defaultFrequencyDays: 4, commonVarieties: ['English', 'French', 'Lemon', 'Creeping'] },
  { name: 'Oregano', category: 'herb', icon: '🌿', defaultWaterGallons: 0.15, defaultFrequencyDays: 3, commonVarieties: ['Greek', 'Italian', 'Mexican'] },
  { name: 'Parsley', category: 'herb', icon: '🌿', defaultWaterGallons: 0.2, defaultFrequencyDays: 2, commonVarieties: ['Flat-leaf', 'Curly'] },
  { name: 'Dill', category: 'herb', icon: '🌿', defaultWaterGallons: 0.2, defaultFrequencyDays: 2, commonVarieties: ['Bouquet', 'Fernleaf', 'Mammoth'] },
  { name: 'Chives', category: 'herb', icon: '🌿', defaultWaterGallons: 0.15, defaultFrequencyDays: 3, commonVarieties: ['Common', 'Garlic'] },
  { name: 'Sage', category: 'herb', icon: '🌿', defaultWaterGallons: 0.15, defaultFrequencyDays: 4, commonVarieties: ['Common', 'Purple', 'Pineapple'] },
  { name: 'Lavender', category: 'herb', icon: '💜', defaultWaterGallons: 0.1, defaultFrequencyDays: 7, commonVarieties: ['English', 'French', 'Spanish'] },

  // Vegetables
  { name: 'Tomato', category: 'vegetable', icon: '🍅', defaultWaterGallons: 0.5, defaultFrequencyDays: 1, commonVarieties: ['Roma', 'Cherry', 'Beefsteak', 'Brandywine', 'San Marzano'] },
  { name: 'Pepper', category: 'vegetable', icon: '🌶️', defaultWaterGallons: 0.4, defaultFrequencyDays: 2, commonVarieties: ['Bell', 'Jalapeño', 'Habanero', 'Cayenne', 'Banana'] },
  { name: 'Cucumber', category: 'vegetable', icon: '🥒', defaultWaterGallons: 0.5, defaultFrequencyDays: 1, commonVarieties: ['Slicing', 'Pickling', 'English', 'Lemon'] },
  { name: 'Zucchini', category: 'vegetable', icon: '🥒', defaultWaterGallons: 0.5, defaultFrequencyDays: 2, commonVarieties: ['Black Beauty', 'Golden', 'Costata Romanesco'] },
  { name: 'Lettuce', category: 'vegetable', icon: '🥬', defaultWaterGallons: 0.3, defaultFrequencyDays: 1, commonVarieties: ['Romaine', 'Butterhead', 'Iceberg', 'Red Leaf'] },
  { name: 'Spinach', category: 'vegetable', icon: '🥬', defaultWaterGallons: 0.25, defaultFrequencyDays: 1, commonVarieties: ['Bloomsdale', 'Savoy', 'Baby'] },
  { name: 'Kale', category: 'vegetable', icon: '🥬', defaultWaterGallons: 0.3, defaultFrequencyDays: 2, commonVarieties: ['Lacinato', 'Curly', 'Red Russian'] },
  { name: 'Green Bean', category: 'vegetable', icon: '🫛', defaultWaterGallons: 0.3, defaultFrequencyDays: 2, commonVarieties: ['Bush', 'Pole', 'Runner'] },
  { name: 'Carrot', category: 'vegetable', icon: '🥕', defaultWaterGallons: 0.25, defaultFrequencyDays: 2, commonVarieties: ['Nantes', 'Danvers', 'Chantenay', 'Purple'] },
  { name: 'Radish', category: 'vegetable', icon: '🔴', defaultWaterGallons: 0.2, defaultFrequencyDays: 1, commonVarieties: ['Cherry Belle', 'French Breakfast', 'Daikon'] },
  { name: 'Squash', category: 'vegetable', icon: '🎃', defaultWaterGallons: 0.5, defaultFrequencyDays: 2, commonVarieties: ['Butternut', 'Acorn', 'Spaghetti', 'Pattypan'] },
  { name: 'Eggplant', category: 'vegetable', icon: '🍆', defaultWaterGallons: 0.4, defaultFrequencyDays: 2, commonVarieties: ['Globe', 'Japanese', 'Italian'] },
  { name: 'Okra', category: 'vegetable', icon: '🌱', defaultWaterGallons: 0.3, defaultFrequencyDays: 2, commonVarieties: ['Clemson Spineless', 'Burgundy', 'Star of David'] },
  { name: 'Sweet Potato', category: 'vegetable', icon: '🍠', defaultWaterGallons: 0.4, defaultFrequencyDays: 3, commonVarieties: ['Beauregard', 'Jewel', 'Covington'] },

  // Fruits
  { name: 'Strawberry', category: 'fruit', icon: '🍓', defaultWaterGallons: 0.2, defaultFrequencyDays: 1, commonVarieties: ['June-bearing', 'Everbearing', 'Alpine'] },
  { name: 'Blueberry', category: 'fruit', icon: '🫐', defaultWaterGallons: 0.3, defaultFrequencyDays: 2, commonVarieties: ['Highbush', 'Lowbush', 'Rabbiteye'] },
  { name: 'Watermelon', category: 'fruit', icon: '🍉', defaultWaterGallons: 0.6, defaultFrequencyDays: 2, commonVarieties: ['Crimson Sweet', 'Sugar Baby', 'Jubilee'] },
];

export const GROWTH_STAGES = [
  { value: 'seedling', label: 'Seedling', icon: '🌱' },
  { value: 'vegetative', label: 'Vegetative', icon: '🌿' },
  { value: 'flowering', label: 'Flowering', icon: '🌸' },
  { value: 'fruiting', label: 'Fruiting', icon: '🍅' },
  { value: 'dormant', label: 'Dormant', icon: '🍂' },
];

export const CONTAINER_TYPES = [
  { value: 'ground', label: 'In Ground' },
  { value: 'raised_bed', label: 'Raised Bed' },
  { value: 'pot', label: 'Container/Pot' },
  { value: 'hydroponic', label: 'Hydroponic' },
];

export const SOIL_TYPES = [
  { value: 'sandy', label: 'Sandy' },
  { value: 'clay', label: 'Clay' },
  { value: 'silt', label: 'Silty' },
  { value: 'loam', label: 'Loam' },
  { value: 'peat', label: 'Peat' },
];
