const MOCK_GUESSES = ['Pothos', 'Monstera', 'Snake Plant'];

export function identifyPlantFromImage() {
  return MOCK_GUESSES[Math.floor(Math.random() * MOCK_GUESSES.length)];
}
