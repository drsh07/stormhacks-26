# SideQuest mobile (Expo + React Native)

The phone app. It holds no API keys and never touches the database: everything
goes through the SideQuest backend (the Next.js project).

## Run it

```bash
npm install
cp .env.example .env      # set EXPO_PUBLIC_API_URL to where the backend runs
npx expo start            # scan the QR code with Expo Go, or press i / a / w
```

The backend must be running (`npm run dev` in the backend folder) or deployed.
On a real phone, `localhost` means the phone itself, so use your laptop's
network address (the "Network" line `npm run dev` prints) or the Vercel URL.

## Where things live

- `src/lib/theme.ts`: design tokens (colors, fonts, hard shadow)
- `src/lib/api.ts`: the one function that talks to the backend
- `src/lib/session.tsx`: who is signed in (saved on the phone, sent as `x-user-id`)
- `src/components/`: Button, Card, AppHeader, DemoSwitcher
- `src/app/`: screens (Expo Router, one file per screen)
