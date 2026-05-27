/**
 * Publish in-app (+ optional email) notification events to RabbitMQ.
 */
export const publishSocialActivity = async (rabbitClient, correlationId, payload) => {
  if (!rabbitClient) return;
  await rabbitClient.publish("social.activity", payload, correlationId);
};
