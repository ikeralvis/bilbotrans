import { NextRequest, NextResponse } from 'next/server';

// Este endpoint puede ser llamado por un cron job externo (ej: GitHub Actions, Vercel Cron)
// para verificar incidencias y enviar notificaciones push

interface OneSignalNotification {
  app_id: string;
  included_segments?: string[];
  filters?: any[];
  headings: { en: string; es: string };
  contents: { en: string; es: string };
  big_picture?: string;
  large_icon?: string;
  ios_attachments?: { image: string };
  data?: any;
}

async function sendOneSignalNotification(notification: OneSignalNotification) {
  const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
  const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
    throw new Error('OneSignal no está configurado');
  }

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      ...notification,
      app_id: ONESIGNAL_APP_ID,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error enviando notificación: ${error}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación (puedes usar un token secreto)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener incidencias actuales
    const incidentsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/metro/incidents?lang=es`
    );
    
    if (!incidentsResponse.ok) {
      throw new Error('Error obteniendo incidencias');
    }

    const incidents = await incidentsResponse.json();
    const serviceIssues = incidents.serviceIssues || [];
    
    // Filtrar incidencias importantes según criterios:
    // 1. stations === 'General' O
    // 2. type === 'service_issue' O 
    // 3. isInIssuesBar === true
    const importantIssues = serviceIssues.filter((issue: any) => 
      issue.stations === 'General' || 
      issue.type === 'service_issue' || 
      issue.isInIssuesBar === true
    );

    // SIEMPRE notificar todas las incidencias activas (sin anti-duplicados)
    if (importantIssues.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay incidencias importantes activas',
        sent: 0,
      });
    }

    const notifications = [];

    // Procesar TODAS las incidencias importantes (cada 10 min)
    for (const issue of importantIssues) {
      // Crear información detallada de la notificación
      let messageParts = [issue.title];
      
      // Añadir estación si existe y no está vacía
      if (issue.stations && issue.stations.trim()) {
        messageParts.push(`Estación: ${issue.stations}`);
      }
      
      // Añadir líneas si existen
      if (issue.line && issue.line.length > 0) {
        messageParts.push(`Línea: ${issue.line.join(', ')}`);
      }
      
      const detailedMessage = messageParts.join('\n');

      // Crear notificación
      const notification: OneSignalNotification = {
        app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
        filters: [
          { field: 'tag', key: 'metro_alerts', relation: '=', value: 'enabled' },
        ],
        headings: {
          en: 'Metro Bilbao Service Alert',
          es: 'Aviso de Metro Bilbao',
        },
        contents: {
          en: detailedMessage,
          es: detailedMessage,
        },
        // Icono para la notificación
        big_picture: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bilbotrans.vercel.app'}/icons/icon-512x512.png`,
        large_icon: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bilbotrans.vercel.app'}/icons/icon-192x192.png`,
        ios_attachments: {
          image: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bilbotrans.vercel.app'}/icons/icon-192x192.png`,
        },
        data: {
          type: 'metro_incident',
          incidentId: issue.createdAt,
          url: '/metro/map',
          station: issue.stations || '',
          line: issue.line || [],
        },
      };

      try {
        const result = await sendOneSignalNotification(notification);
        notifications.push({
          title: issue.title,
          status: 'sent',
          result,
        });
      } catch (error) {
        console.error('Error enviando notificación:', error);
        notifications.push({
          title: issue.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Procesadas ${importantIssues.length} incidencias importantes`,
      sent: notifications.filter((n) => n.status === 'sent').length,
      details: notifications,
      criteria: 'stations=General OR type=service_issue OR isInIssuesBar=true'
    });
  } catch (error) {
    console.error('Error en check-alerts:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// Endpoint GET para verificar estado (disponible en producción para debugging)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Endpoint de verificación de alertas Metro Bilbao',
    usage: 'POST con Authorization: Bearer <token>',
    timestamp: new Date().toISOString(),
    config: {
      hasOneSignalAppId: !!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
      hasOneSignalApiKey: !!process.env.ONESIGNAL_REST_API_KEY,
      hasCronSecret: !!process.env.CRON_SECRET_TOKEN,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'not set',
    },
  });
}
