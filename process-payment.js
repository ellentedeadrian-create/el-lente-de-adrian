// netlify/functions/process-payment.js
//
// Esta función corre en el SERVIDOR de Netlify, nunca en el navegador del cliente.
// Aquí es el ÚNICO lugar donde debe existir tu Access Token de Square, y siempre
// como variable de entorno (nunca escrito directo en este archivo).

const { Client, Environment } = require('square');
const crypto = require('crypto');

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  // Cambia a Environment.Production cuando pases de pruebas (Sandbox) a producción real
  environment: Environment.Sandbox
});

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  try {
    const body = JSON.parse(event.body);
    const { sourceId, amount, nombre, contacto, tipoSesion, paquete, fecha, ciudad } = body;

    if (!sourceId || !amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Faltan datos del pago.' })
      };
    }

    const { paymentsApi } = client;

    const response = await paymentsApi.createPayment({
      sourceId: sourceId, // "ficha" segura de la tarjeta, generada en el navegador por el SDK de Square
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: amount, // en centavos. Ej: depósito de $50.00 = 5000
        currency: 'USD'
      },
      locationId: process.env.SQUARE_LOCATION_ID,
      note: `Depósito - ${tipoSesion} - ${paquete} - ${fecha} - ${nombre} (${contacto}) - ${ciudad}`
    });

    // FASE 2 (pendiente): aquí se podría crear automáticamente la cita en tu calendario
    // de Square Appointments usando bookingsApi.createBooking(). Para eso se necesita
    // el Service Variation ID y el Team Member ID de tu catálogo de Square, que se
    // configuran desde tu Square Dashboard → Appointments → Servicios.

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        paymentId: response.result.payment.id,
        status: response.result.payment.status
      })
    };
  } catch (err) {
    console.error('Error procesando el pago:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message || 'Error al procesar el pago.' })
    };
  }
};
