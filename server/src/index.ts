import app from './app';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.example', override: false });

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 LeasePilot backend listening on http://localhost:${PORT}`);
});
