import { Client } from "@elastic/elasticsearch";

export let esClient;

export const initElasticsearch = async (logger) => {
  const esUrl = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
  const authOpts = {};

  if (process.env.ELASTICSEARCH_API_KEY) {
    authOpts.apiKey = process.env.ELASTICSEARCH_API_KEY;
  } else if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
    authOpts.username = process.env.ELASTICSEARCH_USERNAME;
    authOpts.password = process.env.ELASTICSEARCH_PASSWORD;
  }

  esClient = new Client({
    node: esUrl,
    auth: Object.keys(authOpts).length ? authOpts : undefined
  });

  let retries = 5;
  while (retries > 0) {
    try {
      logger.info(`Connecting to Elasticsearch at ${esUrl}...`);
      await esClient.ping();
      logger.info("Elasticsearch ping successful.");

      // Check if "pins" index exists and migrate if it has old mappings
      const exists = await esClient.indices.exists({ index: "pins" });
      if (exists) {
        const mapping = await esClient.indices.getMapping({ index: "pins" });
        const type = mapping.pins?.mappings?.properties?.title?.type;
        if (type === "text") {
          logger.info("Migrating index 'pins' to search_as_you_type...");
          await esClient.indices.delete({ index: "pins" });
        }
      }

      // Check existence again (in case it was deleted by the migration logic)
      const indexStillExists = await esClient.indices.exists({ index: "pins" });
      if (!indexStillExists) {
        logger.info("Creating index 'pins' with search_as_you_type capabilities...");
        await esClient.indices.create({
          index: "pins",
          body: {
            mappings: {
              properties: {
                title: { type: "search_as_you_type" },
                pin: { type: "search_as_you_type" },
                ownerId: { type: "keyword" },
                mediaUrl: { type: "keyword", index: false },
                mediaType: { type: "keyword", index: false },
                createdAt: { type: "date" }
              }
            }
          }
        });
        logger.info("Index 'pins' created successfully.");
      } else {
        logger.info("Index 'pins' already exists.");
      }
      return;
    } catch (err) {
      retries -= 1;
      logger.error(`Elasticsearch initialization failed. Retries left: ${retries}`, { error: err.message });
      if (retries === 0) {
        logger.error("Could not connect to Elasticsearch after multiple attempts. Exiting...");
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};
