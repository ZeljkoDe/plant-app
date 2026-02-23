const DEFAULT_API_URL = 'https://api.plant.id/v3/identification';
const MOCK_GUESSES = ['Pothos', 'Monstera', 'Snake Plant'];

function fallbackMockResult() {
  const name = MOCK_GUESSES[Math.floor(Math.random() * MOCK_GUESSES.length)];
  return {
    name,
    confidence: 0.5,
    source: 'mock',
  };
}

export async function identifyPlantFromImage(imageUri) {
  const apiKey = process.env.EXPO_PUBLIC_PLANT_ID_API_KEY;

  if (!apiKey) {
    return fallbackMockResult();
  }

  const formData = new FormData();
  formData.append('images', {
    uri: imageUri,
    name: 'plant.jpg',
    type: 'image/jpeg',
  });
  formData.append('classification_level', 'all');
  formData.append('similar_images', 'true');

  const response = await fetch(DEFAULT_API_URL, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Plant.id request failed: ${response.status}`);
  }

  const payload = await response.json();
  const firstSuggestion = payload?.result?.classification?.suggestions?.[0];

  if (!firstSuggestion?.name) {
    return fallbackMockResult();
  }

  return {
    name: firstSuggestion.name,
    confidence: Number(firstSuggestion.probability) || 0,
    source: 'plant.id',
  };
}
