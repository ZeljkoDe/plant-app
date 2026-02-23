export const STORAGE_KEY = 'planty.state.v1';
export const TABS = ['garden', 'journal', 'guides', 'wishlist'];

export const DEFAULT_LOCATIONS = [
  { id: 'loc-living-room', name: 'Living Room' },
  { id: 'loc-bedroom', name: 'Bedroom' },
  { id: 'loc-balcony', name: 'Balcony' },
];

export const CARE_GUIDES = {
  pothos: {
    light: 'Bright to medium indirect light.',
    water: 'Water when top 2-4 cm of soil feels dry.',
    humidity: 'Average home humidity is okay.',
    soil: 'Well-draining indoor potting mix.',
    temperature: '18-29°C.',
  },
  monstera: {
    light: 'Bright indirect light.',
    water: 'Allow top few centimeters to dry first.',
    humidity: 'Medium to high humidity preferred.',
    soil: 'Chunky aroid mix with drainage.',
    temperature: '18-30°C.',
  },
  snakeplant: {
    light: 'Low to bright indirect light.',
    water: 'Water only when soil is fully dry.',
    humidity: 'Low to medium humidity.',
    soil: 'Very well-draining cactus/succulent mix.',
    temperature: '16-30°C.',
  },
};
