import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as WebSocket from 'ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Artisan AI SaaS')
    .setDescription('API backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ─── WebSocket Twilio Media Streams ───────────────────────────────────────
  const httpServer = app.getHttpServer();
  const wss = new (WebSocket as any).Server({ noServer: true });

  httpServer.on('upgrade', (request: any, socket: any, head: any) => {
  if (request.url === '/twilio/stream') {
    wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      wss.emit('connection', ws, request);
    });
  }
  // On ne détruit plus les autres connexions — Socket.io les gère lui-même
});

  wss.on('connection', async (ws: WebSocket) => {
    const twilioRealtimeService = app.get(
      (await import('./twilio/twilio-realtime.service')).TwilioRealtimeService,
    );

    let callSid: string | null = null;
    let sessionStarted = false;

    ws.on('message', async (data: WebSocket.RawData) => {
      let msg: any;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      switch (msg.event) {
        case 'start':
          callSid = msg.start?.callSid ?? msg.start?.customParameters?.callSid ?? null;
          const streamSid = msg.streamSid;
          if (callSid && streamSid && !sessionStarted) {
            sessionStarted = true;
            await twilioRealtimeService.handleMediaStreamOpen(ws, callSid, streamSid);
          }
          break;

        case 'media':
          if (callSid) {
            twilioRealtimeService.handleTwilioAudio(callSid, msg.media.payload);
          }
          break;

        case 'stop':
          if (callSid) {
            await twilioRealtimeService.endSession(callSid);
          }
          ws.close();
          break;
      }
    });

    ws.on('close', async () => {
      if (callSid) {
        await twilioRealtimeService.endSession(callSid);
      }
    });
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();