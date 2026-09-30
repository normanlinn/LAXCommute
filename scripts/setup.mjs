import { copyFile, access } from 'node:fs/promises';
try {
  await access('.env');
  console.log('Your .env already exists. Nothing was overwritten.');
} catch {
  await copyFile('.env.example', '.env');
  console.log(
    'Created .env. Supabase public settings are ready. Add your Apple Maps token when available.',
  );
}
