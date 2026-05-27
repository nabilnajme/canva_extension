# canva-animation-extractor

A lightweight Brave/Chrome extension for finding and downloading Lottie animation JSON files from Canva pages.

The extension is built for a simple workflow: open a Canva design, click the extension, scan the current tab, preview the detected animations, then download the animation JSON or copy its URL.

## Features

- Works only on Canva domains.
- Scans only when you open the popup or click `Scan Canva`.
- Detects Canva-hosted Lottie JSON files.
- Validates JSON files before showing them, so unrelated Canva JSON files are ignored.
- Shows a live preview for each detected animation.
- Downloads the original Lottie JSON file.
- Copies the animation URL to your clipboard.
- Uses a non-persistent background script so it can stay idle when not in use.

## What You Download

The downloaded `.json` file is the actual Lottie animation. Lottie animations are vector-based animation data, not normal image or video files.

You can use the JSON file with:

- LottieFiles Preview or Editor
- `lottie-web`
- `dotlottie-player`
- websites and apps that support Lottie animations
- conversion tools for exporting to video, GIF, or PNG sequences

## Installation In Brave Or Chrome

1. Build the extension:

```bash
npm install
npm run build:chrome
```

2. Open your browser extensions page:

```text
brave://extensions
```

or:

```text
chrome://extensions
```

3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select this folder:

```text
extension/chrome
```

## How To Use

1. Open a Canva design page.
2. Click the `canva-animation-extractor` extension icon.
3. Click `Scan Canva` if the scan does not start automatically.
4. Wait a moment while detected JSON files are validated.
5. Use the preview to identify the animation you want.
6. Click `Download` or `Copy URL`.

## Notes For PowerPoint

PowerPoint does not use Lottie JSON directly.

For presentations, you usually need to convert the JSON to another format:

- `GIF`: easy to insert, but low quality when scaled.
- `MP4`: better quality, but no real transparency.
- `PNG sequence`: best quality and transparency, but harder to use in PowerPoint.

If quality matters, avoid scaling small GIF exports. Convert the Lottie at a high resolution or use a format that matches your slide background.

You can convert downloaded Lottie JSON files to GIF with a transparent background using LottieLab:

- [Lottie to GIF Converter](https://www.lottielab.com/lottie/lottie-to-gif)

Upload the downloaded `.json` file there, choose a transparent background if needed, then export the GIF for use in PowerPoint or other presentation tools.

## Development

Run a development build for Chrome:

```bash
npm run dev:chrome
```

Create a production Chrome build:

```bash
npm run build:chrome
```

Run checks:

```bash
npx tsc --noEmit
npm run lint
```

## Browser Support

This project targets Chromium-based browsers such as Brave and Chrome.

## Limitations

- The extension only scans Canva pages.
- It downloads Lottie JSON files, not GIF or MP4 files.
- Some Canva animations may not be exposed as downloadable Lottie files.
- Some previews may fail if Canva blocks a resource or if the file is not a standard Lottie animation.

## License

MIT


