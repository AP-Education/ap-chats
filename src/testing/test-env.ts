// Importing a module validates config eagerly; tests touch no real services, so placeholders satisfy it.
process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:1/test';
process.env.DIGITAL_OCEAN_SPACES_ENDPOINT ??= 'https://spaces.test';
process.env.DIGITAL_OCEAN_SPACES_ACCESS_KEY ??= 'test';
process.env.DIGITAL_OCEAN_SPACES_SECRET_KEY ??= 'test';
process.env.DIGITAL_OCEAN_SPACES_BUCKET ??= 'test';
