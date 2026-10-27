import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configuration } from './config';
import { configureApp } from './http';

async function bootstrap(): Promise<void> {
  const config = configuration();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  configureApp(app);
  await app.listen(config.port, '0.0.0.0');
}
void bootstrap().catch(() => {
  console.error(
    'API startup failed; verify environment and database configuration.',
  );
  process.exitCode = 1;
});
