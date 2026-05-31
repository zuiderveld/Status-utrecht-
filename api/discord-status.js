/** Zelfde handler als status.js — voor aparte route /api/discord-status */
module.exports = async function handler(req, res) {
  req.query = { ...req.query, discord: '1' };
  return require('./status')(req, res);
};
