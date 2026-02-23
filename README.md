# Planty 🌿

Planty is a calm, modern, adaptive plant care journal for Android/iOS built with Expo + React Native.

## What Planty does

- Learns watering rhythm per plant from real user watering events (no fixed schedule input).
- Schedules smart reminders dynamically as the model adapts.
- Supports notification actions:
  - Mark as watered
  - Snooze 1 day
- Keeps a per-plant journal for:
  - Watering
  - Repotting
  - Fertilizing
  - Pruning
- Includes beginner-friendly care guides.
- Supports location grouping and filtering.
- Supports bulk watering actions.
- Includes a wishlist with conversion to owned plants.
- Includes Plant.id-powered plant identification with automatic mock fallback when API key is missing.

## Run locally

```bash
cd /workspace/plant-app
npm install
npm start
```

Then in Expo:

- Press `a` to run Android.
- Press `i` to run iOS simulator (macOS).
- Or scan QR with Expo Go.

## Notes

- Data is currently stored locally with AsyncStorage.
- Plant identification uses Plant.id when configured, with an automatic mock fallback for local development.
- Notification actions are configured through Expo Notifications category actions.
- This repository intentionally avoids committed binary assets (icons/splash images) to keep PR diffs text-only in environments that reject binary files.

## Project structure

- `App.js`: lightweight app shell and tab routing only.
- `src/hooks/usePlantyApp.js`: app state and business logic orchestration.
- `src/components/tabs/*`: screen-level UI components (garden, journal, guides, wishlist).
- `src/services/*`: integrations (storage, notifications, image picker, species identifier).
- `src/utils/*`: pure helper logic (date and watering model).
- `src/constants/*`: static config and guide content.
- `src/styles/theme.js`: centralized styling.


## Plant identification API setup

Planty uses **Plant.id** as the primary identification provider.

1. Create a Plant.id API key.
2. Set it as an Expo public env variable before starting the app:

```bash
export EXPO_PUBLIC_PLANT_ID_API_KEY=your_key_here
npm start
```

If this variable is not set, Planty automatically falls back to a mock identifier so the UI still works for development.
