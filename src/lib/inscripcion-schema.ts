import { z } from "zod";

export const organizationSchema = z.object({
  name:    z.string().min(3,  "Nombre requerido"),
  rut:     z.string().min(8,  "RUT de la organización requerido"),
  type:    z.string().min(1,  "Tipo de organización requerido"),
  address: z.string().min(5,  "Dirección requerida"),
  commune: z.string().min(2,  "Comuna requerida"),
  phone:   z.string().min(1,  "Teléfono de la organización requerido"),
  email:   z.string().email(  "Correo de la organización inválido"),
  registroNacional:   z.string().optional(),
  bankName:           z.string().min(1,  "Nombre del banco requerido"),
  bankAccountType:    z.string().min(1,  "Tipo de cuenta requerido"),
  bankAccountNumber:  z.string().min(1,  "Número de cuenta requerido"),
  directorioVigencia: z.string().min(1,  "Fecha de vigencia del directorio requerida"),
  members: z.array(
    z.object({
      name:    z.string().min(3),
      rut:     z.string().min(8),
      role:    z.string().min(1),
      email:   z.string().email(),
      phone:   z.string().min(1,  "Teléfono del miembro requerido"),
      address: z.string().min(1,  "Dirección del miembro requerida"),
    })
  ).min(1, "Debe agregar al menos un miembro del directorio"),
});
