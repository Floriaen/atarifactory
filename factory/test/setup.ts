import { existsSync } from 'node:fs';

// Load factory/.env so the gated live e2e (make test-e2e) sees ANTHROPIC_API_KEY.
if (existsSync('.env')) process.loadEnvFile('.env');
