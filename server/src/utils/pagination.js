// src/utils/pagination.js
const paginate = (pageOrQuery = 1, limitParam = 20) => {
  let page = 1;
  let limit = 20;

  if (typeof pageOrQuery === 'object' && pageOrQuery !== null) {
    page = pageOrQuery.page || 1;
    limit = pageOrQuery.limit || limitParam || 20;
  } else {
    page = pageOrQuery;
    limit = limitParam;
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const skip = (pageNum - 1) * limitNum;
  return { skip, limit: limitNum, page: pageNum };
};

const buildPaginationMeta = (total, page, limit) => {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.max(1, parseInt(limit) || 20);
  return {
    total,
    page: p,
    limit: l,
    pages: Math.ceil(total / l),
    hasNext: p * l < total,
    hasPrev: p > 1,
  };
};

module.exports = { paginate, buildPaginationMeta };
