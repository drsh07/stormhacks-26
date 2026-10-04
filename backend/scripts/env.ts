// Import this first in every script so DATABASE_URL etc. exist before lib/ code runs.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
