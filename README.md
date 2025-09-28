# Memory Dashboard Web

Web dashboard for Memory System API - Vue 3 + Vuetify 3 interface for semantic memory management.

## Description

A modern, responsive web interface for the Memory System API that provides:
- Collection browsing and management
- Semantic search capabilities
- Real-time updates via WebSocket
- System metrics and monitoring
- Memory playground for testing queries

Built with Vue 3, Vuetify 3, and TypeScript for a robust, maintainable codebase.

## Author

Robert Sigler <code@sigler.io>

## License

MIT License

## Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Usage

1. Configure the Memory API endpoint in environment variables
2. Start the development server
3. Navigate to http://localhost:3000
4. Connect to your Memory System API instance

## Contributing

Contributions are welcome! Please follow these guidelines:
- Use TypeScript for all new code
- Follow Vue 3 Composition API patterns
- Use Vuetify 3 components for consistency
- Write tests for new features
- Follow the existing code style

## Environment Variables

```bash
VITE_API_BASE_URL=http://localhost:8080  # Memory API server URL
VITE_APP_TITLE=Memory Dashboard         # Application title
```
