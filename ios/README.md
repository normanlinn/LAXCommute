# LAXCommute for iOS

Native Swift + SwiftUI app on the `ios` branch. The PWA stays on `main`. Minimum iOS 17; open the included `LAXCommute.xcodeproj` in Xcode 15 or newer. No package dependencies or MapKit JS token are required.

## Run on your Mac

1. Save any local changes, then `git fetch origin` and `git switch ios` (or `git switch --track origin/ios` if the local branch does not exist).
2. Open `ios/LAXCommute.xcodeproj`.
3. Select the **LAXCommute** scheme and an iPhone simulator. Press Run.
4. To run on your iPhone, choose your Apple development team under **Signing & Capabilities**, use a unique bundle identifier, select your connected phone and enable Developer Mode when prompted.

No Mac/Xcode environment was available while this project was created. The iOS GitHub Actions workflow compiles the app and runs its unit tests on a macOS simulator runner; check its result before installing or distributing. Until that passes and device testing is complete, this is an implementation for review, not a verified release.

## Included

- Native Apple Maps with real bus/stop markers, route polylines, map camera controls and walking directions.
- South/East/West routes matching the PWA. East and West default to their own lots while offering South Lot stops returned by their route feed.
- To work/To parking, manual boarding-stop selection, optional nearest-stop location request and saved exact stops.
- Live arrival estimates, explicit scheduled labels, stale-data expiry and walking-time/departure-buffer advice. No simulated buses.
- English/Myanmar toggle and System/Light/Dark appearance, with preferences retained.
- The approved turquoise/navy icon and dark-mode control borders.
- Supabase email/password sign-in, signup, email-code confirmation, password recovery, Keychain sessions and account-specific commute sync using the PWA's `user_metadata.commute` format. Guest settings stay on the device.
- Polling once a minute while the trip tab is active and the app is in the foreground. No background location tracking.

English uses native system typography. Myanmar uses only the uploaded **Z06-Walone Regular** (`Z06Walone`) and **Z06-Walone Bold** (`Z06Walone-Bold`), registered through `UIAppFonts`. The full TTF files are embedded; no Myanmar conversion or Zawgyi transliteration is performed. The PWA uses WOFF versions of the same uploads. Fonts cover all current translated Myanmar characters. Obtain the designer's commercial/redistribution license before a commercial agreement; the supplied metadata says copyright 2022 ZinBo, all rights reserved, with no license included.

## Account setup

The public Supabase URL/key are in `LAXCommute/Info.plist`; they match the PWA. Never put a service-role key here. Production SMTP and email templates are configured in Supabase, not Xcode.

Include `{{ .Token }}` in both **Confirm signup** and **Reset password** templates as described in `../docs/AUTH.md`. This app uses typed email codes so users can complete confirmation/recovery inside the native app. Email links continue to open the website; native universal-link/PKCE handoff is not implemented. Existing confirmed PWA accounts can sign in with the same email/password. Saved commute settings are fetched at login or by **Sync saved commute**, and uploaded when saved; sync is not realtime.

The API base is `https://employeeshuttlelax.com`, reusing the deployed `/api/routes/:id` and `/api/live/:id` gateway. Keep the PWA gateway deployed. Change `AppConfig.website` if the domain changes.

## Validate

```bash
xcodebuild -project ios/LAXCommute.xcodeproj -scheme LAXCommute \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
xcodebuild -project ios/LAXCommute.xcodeproj -scheme LAXCommute \
  -destination 'platform=iOS Simulator,name=YOUR_AVAILABLE_IPHONE_SIMULATOR' \
  CODE_SIGNING_ALLOWED=NO test
```

Check English/Myanmar shaping at large text sizes, both appearances, location allowed/denied, switching routes while loading, East/West South Lot boarding, stale/offline feeds, account confirmation/reset, sign-out and same-account PWA sync on a real iPhone. Account deletion, published privacy policy, verified data-use permission, operational monitoring and distribution review remain commercial-release prerequisites; this branch does not resolve them. The included privacy manifest documents the current code's email/account/profile processing and UserDefaults use, and still needs a final distribution review against the actual deployed configuration.

This is a new project: there was no existing Swift/Xcode source in this repository to update. No Apple Watch target is included. It is not an App Store/TestFlight submission.
