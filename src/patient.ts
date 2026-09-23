import type { Patient } from './types';

export function createPatient(
  name: string,
  address: string,
  now: Date = new Date(),
  labels: readonly string[] = [],
): Patient {
  const timestamp = now.toISOString();
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    address: address.trim(),
    labels: [...labels],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updatePatientFields(
  patient: Patient,
  name: string,
  address: string,
  now: Date = new Date(),
  labels: readonly string[] = patient.labels,
): Patient {
  return {
    ...patient,
    name: name.trim(),
    address: address.trim(),
    labels: [...labels],
    updatedAt: now.toISOString(),
  };
}
