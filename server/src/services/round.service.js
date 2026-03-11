const InterviewRound = require("../models/InterviewRound.model");
const Company = require("../models/Company.model");
const { SOCKET_EVENTS } = require("../utils/constants");
const { getIO } = require("../config/socket");

const createRound = async (companyId, roundNumber, roundName = "") => {
  const round = await InterviewRound.create({ companyId, roundNumber, roundName });
  return round;
};

const activateRound = async (companyId, roundId) => {
  // Deactivate all rounds for this company
  await InterviewRound.updateMany({ companyId }, { isActive: false });
  // Activate the selected round
  const round = await InterviewRound.findByIdAndUpdate(roundId, { isActive: true }, { new: true });
  await Company.findByIdAndUpdate(companyId, { currentRound: round.roundNumber });

  try {
    getIO().to(`company:${companyId}`).emit(SOCKET_EVENTS.ROUND_UPDATED, {
      companyId,
      activeRound: round,
    });
  } catch (_) {}

  return round;
};

module.exports = { createRound, activateRound };
