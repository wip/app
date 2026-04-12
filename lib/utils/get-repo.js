module.exports = function getRepo(payload, options) {
  return {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    ...options,
  };
};
