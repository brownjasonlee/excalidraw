# Excalidraw Monorepo

This repository contains the source code for Excalidraw, a virtual whiteboard for sketching hand-drawn like diagrams. It includes the main application and the React component.

## About Excalidraw

Excalidraw is a virtual whiteboard tool that lets you easily sketch diagrams that have a hand-drawn feel. It is designed to be simple and intuitive, making it great for brainstorming, explaining architectures, or just quick doodles.

### Key Features

- **Infinite Canvas**: A zoomable, pannable canvas that lets you draw without limits.
- **Hand-Drawn Style**: Elements look like they were drawn by hand, giving diagrams a friendly and informal look.
- **Rich Toolset**: Includes rectangles, circles, diamonds, arrows, lines, free-draw, and text.
- **Customization**: Change stroke colors, background colors, stroke width, sloppiness, and more.
- **Library**: Save and reuse your favorite shapes and diagrams.
- **Export**: Export your drawings as PNG, SVG, or JSON to share or save.
- **Dark Mode**: Switch between light and dark themes.
- **Localization**: Support for multiple languages.

## Usage

Once the application is running, you can use the toolbar at the top to select different tools.

### Basic Tools

- **Selection (V)**: Select and move objects.
- **Rectangle (R)**: Draw rectangles.
- **Diamond (D)**: Draw diamonds.
- **Ellipse (O)**: Draw circles and ellipses.
- **Arrow (A)**: Draw arrows to connect shapes.
- **Line (L)**: Draw simple lines.
- **Draw (P)**: Freehand drawing tool.
- **Text (T)**: Add text labels.
- **Image**: Upload images to the canvas.
- **Eraser (E)**: Erase elements.

### Common Shortcuts

- **Save**: `Ctrl/Cmd + S`
- **Open**: `Ctrl/Cmd + O`
- **Undo**: `Ctrl/Cmd + Z`
- **Redo**: `Ctrl/Cmd + Shift + Z`
- **Zoom In/Out**: `Ctrl/Cmd + +` / `Ctrl/Cmd + -` (or standard pinch/scroll gestures)
- **Pan**: Hold `Space` and drag, or use the middle mouse button.
- **Group**: `Ctrl/Cmd + G`
- **Ungroup**: `Ctrl/Cmd + Shift + G`
- **Send to Back**: `Ctrl/Cmd + [`
- **Bring to Front**: `Ctrl/Cmd + ]`
- **Grid Mode**: `Ctrl/Cmd + '`
- **Zen Mode**: `Alt + Z`

## Development

### Prerequisites

- Node.js >= 18.0.0
- Yarn

### Installation

To install dependencies, run:

```bash
yarn install
```

### Starting the Local Development Server

To start the application locally:

```bash
yarn start
```

This will run the `excalidraw-app` using Vite. Open [http://localhost:3000](http://localhost:3000) (or the port shown in the terminal) to view it.

## Building

### Building the Application

To build the application:

```bash
yarn build
```

### Building Packages

To build the packages (common, math, element, excalidraw):

```bash
yarn build:packages
```

## Docker

To run the application using Docker Compose:

```bash
docker-compose up
```

## Testing

To run the smoke tests:

```bash
yarn test
```

## License

This project is licensed under the MIT License.
