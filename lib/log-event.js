module.exports = logEvent;

function logEvent({ id, name, payload, log }) {
  const fullEventName = payload.action ? `${name}.${payload.action}` : name;
  const owner = payload.installation.account.login.toLowerCase();
  log.info(
    {
      id,
      event: name,
      action: payload.action,
      installation: payload.installation.id,
      owner,
      isEventStat: true,
    },
    `${fullEventName} event received for ${owner} (id: ${id})`
  );
}
