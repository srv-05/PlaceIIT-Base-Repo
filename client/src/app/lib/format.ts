export const formatSlotLabel = (slot: string | undefined | null) => {
  if (!slot) return "—";
  let formatted = slot.replace(/\b\w/g, c => c.toUpperCase());
  if (!formatted.toLowerCase().includes("slot")) {
    formatted += " Slot";
  }
  return formatted;
};
