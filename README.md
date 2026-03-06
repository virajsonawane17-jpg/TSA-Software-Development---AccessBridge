# AccessBridge - Accessibility Assistant App

## Project Overview

This is a cross-platform mobile accessibility application built with React Native and Expo.

**Platform**: Native iOS & Android app, exportable to web
**Framework**: Expo Router + React Native

## Development Setup

### Prerequisites
- Node.js & Bun installed

### Getting Started

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Start development server**:
   ```bash
   bun start
   ```

3. **Web development**:
   ```bash
   bun start --web
   ```

## Technology Stack

- **React Native** - Cross-platform mobile development framework
- **Expo** - Development platform and tools
- **Expo Router** - File-based routing system
- **TypeScript** - Type-safe JavaScript
- **React Query** - Server state management
- **Lucide React Native** - Icon library

## Testing

### Mobile Testing

**iOS**: Download from App Store or use Expo Go
**Android**: Download from Google Play
**Web**: Run `bun start --web` for browser testing

## Deployment

### App Store (iOS)
1. Install EAS CLI:
   ```bash
   bun i -g @expo/eas-cli
   ```

2. Configure and build:
   ```bash
   eas build:configure
   eas build --platform ios
   eas submit --platform ios
   ```

### Google Play (Android)
```bash
eas build --platform android
eas submit --platform android
```

### Web Deployment
```bash
eas build --platform web
eas hosting:deploy
```

## Project Structure

```
├── app/                    # App screens
├── components/             # Reusable components
├── contexts/              # React contexts
├── constants/             # App constants
├── lib/                   # Utilities
└── assets/                 # Static assets
```

## App Features

This template includes:

- **Cross-platform compatibility** - Works on iOS, Android, and Web
- **File-based routing** with Expo Router
- **Tab navigation** with customizable tabs
- **Modal screens** for overlays and dialogs
- **TypeScript support** for better development experience
- **Async storage** for local data persistence
- **Vector icons** with Lucide React Native

## Troubleshooting

### **App not loading on device?**

1. Make sure your phone and computer are on the same WiFi network
2. Try using tunnel mode: `bun start -- --tunnel`
3. Check if your firewall is blocking the connection

### **Build failing?**

1. Clear your cache: `bunx expo start --clear`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && bun install`
3. Check [Expo's troubleshooting guide](https://docs.expo.dev/troubleshooting/build-errors/)

### **Need help with native features?**

- Check [Expo's documentation](https://docs.expo.dev/) for native APIs
- Browse [React Native's documentation](https://reactnative.dev/docs/getting-started) for core components
