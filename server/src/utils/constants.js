const ROLES = {
  STUDENT: "student",
  COCO: "coco",
  ADMIN: "admin",
};

const STUDENT_STATUS = {
  NOT_JOINED: "not_joined",
  IN_QUEUE: "in_queue",
  IN_INTERVIEW: "in_interview",
  COMPLETED: "completed",
  REJECTED: "rejected",
  ON_HOLD: "on_hold",
  OFFER_GIVEN: "offer_given",
};

const INTERVIEW_MODES = {
  ONLINE: "online",
  OFFLINE: "offline",
  HYBRID: "hybrid",
};

const SLOTS = {
  MORNING: "morning",
  AFTERNOON: "afternoon",
  EVENING: "evening",
};

const PREDEFINED_NOTIFICATIONS = [
  "Please report to the interview venue immediately.",
  "Your interview is about to begin. Please be ready.",
  "You have been called for the next round.",
  "Please wait, your interview will start shortly.",
  "Congratulations! You have cleared this round.",
];

const SOCKET_EVENTS = {
  QUEUE_UPDATED: "queue:updated",
  STATUS_UPDATED: "status:updated",
  NOTIFICATION_SENT: "notification:sent",
  ROUND_UPDATED: "round:updated",
  WALKIN_UPDATED: "walkin:updated",
};

module.exports = {
  ROLES,
  STUDENT_STATUS,
  INTERVIEW_MODES,
  SLOTS,
  PREDEFINED_NOTIFICATIONS,
  SOCKET_EVENTS,
};
