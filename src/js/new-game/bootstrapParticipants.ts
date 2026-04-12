import type {
  ParticipantRegistration,
  ParticipantSummary,
} from './contracts.js';
import {
  createClientBindings,
  type ParticipantClientBinding,
} from './createClientBindings.js';

const localParticipant = (sessionId: string): ParticipantRegistration => ({
  participantId: `${sessionId}:p0`,
  role: 'local_human',
  playerId: `${sessionId}:player0`,
  clientType: 'local_player',
  registered: true,
});

const aiParticipant = (
  sessionId: string,
  offset: 1 | 2
): ParticipantRegistration => ({
  participantId: `${sessionId}:p${offset}`,
  role: 'ai',
  playerId: `${sessionId}:player${offset}`,
  clientType: 'ai_client',
  registered: true,
});

export interface ParticipantBootstrapResult {
  participants: ParticipantRegistration[];
  bindings: ParticipantClientBinding[];
  summary: ParticipantSummary;
}

export const bootstrapParticipants = (
  sessionId: string
): ParticipantBootstrapResult => {
  const participants = [
    localParticipant(sessionId),
    aiParticipant(sessionId, 1),
    aiParticipant(sessionId, 2),
  ];

  const bindings = createClientBindings(participants);

  return {
    participants,
    bindings,
    summary: {
      totalParticipants: 3,
      localParticipants: 1,
      aiParticipants: 2,
      allRegistered: participants.every((participant) => participant.registered),
    },
  };
};

