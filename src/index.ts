import { app } from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`ADFORT server running on port ${env.PORT}`);
});