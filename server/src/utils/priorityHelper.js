/**
 * Sorts companies for a student based on predefined priority order.
 * Priority data comes from Excel upload (Google Form responses).
 */

const sortCompaniesByPriority = (companies, priorityMap) => {
  return [...companies].sort((a, b) => {
    const pa = priorityMap[a.companyId?.toString()] ?? Infinity;
    const pb = priorityMap[b.companyId?.toString()] ?? Infinity;
    return pa - pb;
  });
};

/**
 * Build priority map from student priority array
 * priorityList: [{ companyId, order }]
 */
const buildPriorityMap = (priorityList = []) => {
  const map = {};
  priorityList.forEach(({ companyId, order }) => {
    map[companyId.toString()] = order;
  });
  return map;
};

module.exports = { sortCompaniesByPriority, buildPriorityMap };
