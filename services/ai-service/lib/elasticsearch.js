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

      // Check if "pins" index exists and migrate if it lacks embedding_vector
      const exists = await esClient.indices.exists({ index: "pins" });
      if (exists) {
        const mapping = await esClient.indices.getMapping({ index: "pins" });
        // Under different environments, index name could be different or structure nested differently
        const indexKey = Object.keys(mapping)[0] || "pins";
        const properties = mapping[indexKey]?.mappings?.properties;
        if (!properties?.embedding_vector) {
          logger.info("Migrating index 'pins' to support dense_vector embeddings...");
          await esClient.indices.delete({ index: "pins" });
        }
      }

      // Check existence again (in case it was deleted by the migration logic)
      const indexStillExists = await esClient.indices.exists({ index: "pins" });
      if (!indexStillExists) {
        logger.info("Creating index 'pins' with search_as_you_type and dense_vector capabilities...");
        await esClient.indices.create({
          index: "pins",
          body: {
            settings: {
              index: {
                mapping: {
                  exclude_source_vectors: false
                }
              }
            },
            mappings: {
              properties: {
                title: { type: "search_as_you_type" },
                pin: { type: "search_as_you_type" },
                tags: { type: "keyword" },
                ownerId: { type: "keyword" },
                mediaUrl: { type: "keyword", index: false },
                mediaType: { type: "keyword", index: false },
                createdAt: { type: "date" },
                embedding_vector: {
                  type: "dense_vector",
                  dims: 768,
                  index: true,
                  similarity: "cosine"
                }
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
