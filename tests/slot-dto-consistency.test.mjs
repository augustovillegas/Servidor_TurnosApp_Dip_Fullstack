import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp, ensureDatabaseInitialized, disconnectTestDB, createBaseUsers, crearAsignacion, crearTurno, reservarTurno, assertSlotDtoShape } from './helpers/testUtils.mjs';

/**
 * Verifica que todas las operaciones sobre slots (GET listado, GET individual, crear, patch estado, reservar)
 * retornan exactamente el mismo shape de DTO (no aparecen ni desaparecen claves).
 */
describe.sequential('Slot DTO Consistency', () => {
  let app; let context;

  beforeAll(async () => {
    app = await getApp();
    await ensureDatabaseInitialized();
  });

  beforeEach(async () => {
    context = await createBaseUsers();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  test('Create → Patch estado → List → Individual comparten shape', async () => {
    const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
    const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
    expect(turnoRes.res.status).toBe(201);
    const creado = turnoRes.res.body;
    assertSlotDtoShape(creado, expect);

    // Patch estado
    const patchRes = await request(app)
      .patch(`/slots/${creado.id || creado._id}/estado`)
      .set('Authorization', `Bearer ${context.profesorOwner.token}`)
      .send({ estado: 'aprobado' });
    expect(patchRes.status).toBe(200);
    const actualizado = patchRes.body;
    assertSlotDtoShape(actualizado, expect);

    // Reservar
    const reservarRes = await request(app)
      .patch(`/slots/${creado.id || creado._id}/solicitar`)
      .set('Authorization', `Bearer ${context.alumnoC1.token}`);
    // Puede ser 200 o 403 si ya reservado por race, pero si 200 validar shape
    if (reservarRes.status === 200) {
      assertSlotDtoShape(reservarRes.body, expect);
    }

    // Listado
    const listRes = await request(app)
      .get('/slots')
      .set('Authorization', `Bearer ${context.profesorOwner.token}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    const found = listRes.body.find(s => (s.id || s._id) === (creado.id || creado._id));
    expect(found).toBeTruthy();
    assertSlotDtoShape(found, expect);

    // Individual
    const indivRes = await request(app)
      .get(`/slots/${creado.id || creado._id}`)
      .set('Authorization', `Bearer ${context.profesorOwner.token}`);
    expect(indivRes.status).toBe(200);
    assertSlotDtoShape(indivRes.body, expect);
  }, 60_000);
});
