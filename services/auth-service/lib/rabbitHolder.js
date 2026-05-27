let rabbitClient = null;

export const setRabbitClient = (client) => {
  rabbitClient = client;
};

export const getRabbitClient = () => rabbitClient;
