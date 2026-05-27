import amqplib from "amqplib";
import crypto from "crypto";

export const EVENTS = {
  USER_REGISTERED: "user.registered",
  USER_UPDATED: "user.updated",
  USER_DELETED: "user.deleted",
  ENTITY_CREATED: "entity.created",
  ENTITY_UPDATED: "entity.updated",
  ENTITY_DELETED: "entity.deleted",
  PROCESS_COMPLETED: "process.completed",
  PROCESS_FAILED: "process.failed",
  NOTIFICATION_TRIGGERED: "notification.triggered",
  SOCIAL_ACTIVITY: "social.activity",
  MESSAGE_RECEIVED: "message.received"
};

export class RabbitMQClient {
  constructor(amqpUrl, logger) {
    this.amqpUrl = amqpUrl;
    this.logger = logger;
    this.connection = null;
    this.channel = null;
    this.exchangeName = "proimg.topic";
    this.dlxName = "proimg.dlx";
    this.dlqName = "proimg.dlq";
    this.isConnected = false;
  }

  async connect() {
    let retries = 5;
    while (retries > 0) {
      try {
        this.logger.info(`Connecting to RabbitMQ at ${this.amqpUrl.replace(/:[^:]*@/, ":***@")}...`);
        this.connection = await amqplib.connect(this.amqpUrl);
        this.channel = await this.connection.createChannel();
        this.isConnected = true;
        this.logger.info("Successfully connected to RabbitMQ and created channel.");

        // Setup DLX & DLQ
        await this.channel.assertExchange(this.dlxName, "fanout", { durable: true });
        await this.channel.assertQueue(this.dlqName, { durable: true });
        await this.channel.bindQueue(this.dlqName, this.dlxName, "");

        // Setup Main Topic Exchange
        await this.channel.assertExchange(this.exchangeName, "topic", { durable: true });

        // Handle connection drop
        this.connection.on("close", () => {
          this.logger.error("RabbitMQ connection closed. Attempting reconnect...");
          this.isConnected = false;
          setTimeout(() => this.connect(), 5000);
        });

        this.connection.on("error", (err) => {
          this.logger.error("RabbitMQ connection error:", { error: err.message });
        });

        return;
      } catch (err) {
        retries -= 1;
        this.logger.error(`RabbitMQ connection failed. Retries left: ${retries}`, { error: err.message });
        if (retries === 0) {
          this.logger.error("Could not connect to RabbitMQ after multiple attempts. Exiting...");
          process.exit(1);
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  // Publish event with a routing key
  async publish(routingKey, data, correlationId = null) {
    if (!this.isConnected || !this.channel) {
      this.logger.error("Cannot publish: RabbitMQ client is not connected.");
      return false;
    }

    const cId = correlationId || crypto.randomUUID();
    const payload = {
      event: routingKey,
      timestamp: new Date().toISOString(),
      correlationId: cId,
      data
    };

    try {
      this.channel.publish(
        this.exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true } // Message persistence
      );
      this.logger.info(`RabbitMQ Event Published: [RoutingKey: ${routingKey}] [CorrelationID: ${cId}]`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to publish event to RoutingKey: ${routingKey}`, { error: err.message });
      return false;
    }
  }

  // Subscribe to a durable queue with dead-letter configuration
  async subscribe(queueName, routingKeys = [], onMessage) {
    if (!this.isConnected || !this.channel) {
      this.logger.error("Cannot subscribe: RabbitMQ client is not connected.");
      return;
    }

    try {
      // Assert queue with Dead Letter Exchange configuration
      await this.channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": this.dlxName
        }
      });

      // Bind routing keys
      for (const routingKey of routingKeys) {
        await this.channel.bindQueue(queueName, this.exchangeName, routingKey);
        this.logger.info(`Bound Queue: ${queueName} to RoutingKey: ${routingKey}`);
      }

      // Prefetch limit (Work Queues model)
      await this.channel.prefetch(1);

      this.channel.consume(
        queueName,
        async (msg) => {
          if (!msg) return;

          let payload;
          try {
            payload = JSON.parse(msg.content.toString());
          } catch (err) {
            this.logger.error(`Malformed JSON message in Queue: ${queueName}. Discarding to DLQ.`, { raw: msg.content.toString() });
            this.channel.nack(msg, false, false); // Nack and do not requeue -> routes directly to DLQ
            return;
          }

          const correlationId = payload.correlationId || "unknown";
          this.logger.info(`RabbitMQ Event Received on Queue: ${queueName} [RoutingKey: ${msg.fields.routingKey}] [CorrelationID: ${correlationId}]`);

          try {
            await onMessage(payload, msg.fields.routingKey);
            this.channel.ack(msg); // Processed successfully
          } catch (processError) {
            this.logger.error(`Error processing message on Queue: ${queueName}. Triggering retry / DLQ.`, {
              error: processError.message,
              payload
            });
            
            // Requeue attempt logic or nack without requeue (to DLQ) for safety
            const headers = msg.properties.headers || {};
            const deathCount = (headers["x-death"] && headers["x-death"][0] && headers["x-death"][0].count) || 0;

            if (deathCount < 3) {
              // Retry: Nack and requeue
              this.logger.warn(`Retrying message in Queue: ${queueName}. Death count: ${deathCount}`);
              this.channel.nack(msg, false, true); // Nack and requeue
            } else {
              // Exceeded retries: Nack and send to DLQ
              this.logger.error(`Exceeded maximum retries (3) for message in Queue: ${queueName}. Sending to DLQ.`);
              this.channel.nack(msg, false, false); // Nack and send to DLX -> DLQ
            }
          }
        },
        { noAck: false }
      );

      this.logger.info(`Successfully subscribed to Queue: ${queueName}`);
    } catch (err) {
      this.logger.error(`Failed to subscribe to Queue: ${queueName}`, { error: err.message });
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      this.logger.info("RabbitMQ connection closed gracefully.");
    } catch (err) {
      this.logger.error("Error closing RabbitMQ connection:", { error: err.message });
    }
  }
}
