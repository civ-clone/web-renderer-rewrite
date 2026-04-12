import type { ParticipantRegistration } from './contracts.js';

export interface ParticipantClientBinding {
  participantId: string;
  playerId: string;
  clientType: ParticipantRegistration['clientType'];
}

export const createClientBindings = (
  participants: ParticipantRegistration[]
): ParticipantClientBinding[] =>
  participants.map((participant) => ({
    participantId: participant.participantId,
    playerId: participant.playerId,
    clientType: participant.clientType,
  }));

