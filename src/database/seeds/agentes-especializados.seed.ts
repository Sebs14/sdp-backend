import { DataSource } from 'typeorm';
import { AgenteEspecializado } from '../../agentes-especializados/entities/agente-especializado.entity';

export async function seedAgentesEspecializados(dataSource: DataSource) {
  const repo = dataSource.getRepository(AgenteEspecializado);
  const existing = await repo.count();
  if (existing > 0) {
    console.log('Agentes especializados ya sembrados, omitiendo...');
    return;
  }

  // support_agent_id: reemplazar con el ID real de cada agente creado en la consola de xAI
  const agentes = [
    {
      tipification1: 'Remediacion',
      nombreAgente: 'SDP - Agente Remediación',
      supportAgentId: 'support_agent_6fbb775d-8245-4a30-aa11-b83a11194b7c',
      activo: true,
    },
    {
      tipification1: 'Gestion escolar',
      nombreAgente: 'SDP - Agente Gestión Escolar',
      supportAgentId: 'support_agent_cf1c8693-13c8-4f88-9568-d6cb8bf4531f',
      activo: true,
    },
    {
      tipification1: 'Evaluacion',
      nombreAgente: 'SDP - Agente Evaluación',
      supportAgentId: 'support_agent_0e1192d6-0586-4ab4-a894-069d1b3f37a7',
      activo: true,
    },
    {
      tipification1: 'Aprendizaje',
      nombreAgente: 'SDP - Agente Aprendizaje',
      supportAgentId: 'support_agent_e5739ac8-ab93-4c2b-b08e-175ae5712d9c',
      activo: true,
    },
    {
      tipification1: 'Administrativo',
      nombreAgente: 'SDP - Agente Administrativo',
      supportAgentId: 'support_agent_a7a7d2a5-858c-421d-80cd-01e2c9059fae',
      activo: true,
    },
    {
      tipification1: 'Tecnologia',
      nombreAgente: 'SDP - Agente Tecnología',
      supportAgentId: 'support_agent_77d09ea1-2f47-457c-bbce-bf29c55c0500',
      activo: true,
    },
    {
      tipification1: 'Conectividad',
      nombreAgente: 'SDP - Agente Conectividad',
      supportAgentId: 'support_agent_4931a4fa-8513-4ce4-aa9c-78b56dd5d843',
      activo: true,
    },
    {
      tipification1: 'Infraestructura',
      nombreAgente: 'SDP - Agente Infraestructura',
      supportAgentId: 'support_agent_cb167a63-b913-49a6-b711-911d211f9c83',
      activo: true,
    },
    {
      tipification1: 'Plataforma educativa',
      nombreAgente: 'SDP - Agente Plataforma Educativa',
      supportAgentId: 'support_agent_25a53a49-1a76-4bb2-a1c1-66d17c838a94',
      activo: true,
    },
    {
      tipification1: 'Agenda civica',
      nombreAgente: 'SDP - Agente Agenda Cívica',
      supportAgentId: 'support_agent_50ab432b-7f61-4422-ba24-80e32ce71a54',
      activo: true,
    },
    {
      tipification1: 'Denuncias',
      nombreAgente: 'SDP - Agente Denuncias',
      supportAgentId: 'support_agent_ff4fa303-7e7a-4516-a2f5-86a952ff4c5c',
      activo: true,
    },
    {
      tipification1: 'Indisciplina',
      nombreAgente: 'SDP - Agente Indisciplina',
      supportAgentId: 'support_agent_1463cefe-bf73-4c75-9210-5d663bcace4a',
      activo: true,
    },
    {
      tipification1: 'Solicitudes',
      nombreAgente: 'SDP - Agente Solicitudes',
      supportAgentId: 'support_agent_2476a67c-9c8d-48b1-baea-66fcd0d5bebb',
      activo: true,
    },
    {
      tipification1: 'Otro',
      nombreAgente: 'SDP - Agente General',
      supportAgentId: 'support_agent_d7d12350-3a1e-433a-8c68-5437eabf1902',
      activo: true,
    },
  ];

  await repo.save(agentes);
  console.log(`${agentes.length} agentes especializados sembrados.`);
}
