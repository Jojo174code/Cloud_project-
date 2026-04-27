import app from './app';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.example', override: false });

const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LeasePilot backend listening on http://0.0.0.0:${PORT}`);
});
