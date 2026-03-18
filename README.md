# dabba-rider-app

Dabba Nation Delivery Partner App — React Native (Expo)

## Setup

```bash
cd dabba-rider-app
npm install
npx expo start
```

## Run

- **Mobile**: Scan QR code with Expo Go app
- **Web**: Press `w` in terminal or run `npx expo start --web`
- **Android**: `npx expo start --android`
- **iOS**: `npx expo start --ios`

## Project Structure

```
dabba-rider-app/
├── App.tsx                    # Entry point
├── src/
│   ├── api/api.ts            # Centralized API service (axios)
│   ├── context/AuthContext.tsx # Auth state management
│   ├── hooks/socket.ts       # Socket.IO connection
│   ├── types/index.ts        # TypeScript type definitions
│   ├── theme/colors.ts       # Design tokens matching web app
│   ├── navigation/
│   │   └── AppNavigator.tsx  # React Navigation setup
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── ActiveOrderScreen.tsx
│   │   ├── EarningsScreen.tsx
│   │   └── ProfileScreen.tsx
│   └── components/
│       └── IncomingOrderModal.tsx
```

## Backend

Connects to the same `Dabba_Delight_Backend` API server.
Update `BASE_URL` in `src/api/api.ts` with your backend URL.

## Environment

Set backend URL in `src/api/api.ts`:
```ts
const BASE_URL = 'https://your-backend-url.com';
```
