const queueService = require("../services/queue.service");

// @desc    Get full queue for a company
// @route   GET /api/queue/:companyId
const getQueue = async (req, res) => {
  try {
    const queue = await queueService.getQueue(req.params.companyId);
    res.json(queue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update queue entry status
// @route   PUT /api/queue/status
const updateQueueStatus = async (req, res) => {
  try {
    const { studentId, companyId, status, roundId, panelId } = req.body;
    const result = await queueService.updateStatus(studentId, companyId, status, roundId, panelId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { getQueue, updateQueueStatus };
