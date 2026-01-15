# Excalidraw Monorepo

This repository contains the source code for Excalidraw, including the main application and the React component.

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

This will run the `excalidraw-app` using Vite.

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
