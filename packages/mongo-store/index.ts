/*
  © Copyright IBM Corporation 2022. All Rights Reserved.

  SPDX-License-Identifier: EPL-2.0
*/
import { MongoServiceConfig } from '@ibm-aca/common-config';
import logger from '@ibm-aca/common-logger';
import { CreateIndexesOptions, Document, Filter, IndexSpecification, MongoClient, MongoClientOptions, ReadPreference } from 'mongodb';

export class MongoStore {
  private readonly client: MongoClient;
  private config: MongoServiceConfig;

  constructor(config: MongoServiceConfig) {
    const options: MongoClientOptions = {
      readPreference: ReadPreference.SECONDARY_PREFERRED,
    };

    if (config.MONGO_SSL && config.MONGO_SSL_CERT_PATH) {
      options.ssl = true;
      options.sslValidate = true;
      options.sslCA = config.MONGO_SSL_CERT_PATH;
    } else {
      logger.info(`[mongoStore][connect] SSL Authentication disabled or SSL Certifcate path is not provided. Skipping SSL use for auth.`);
    }

    this.client = new MongoClient(config.MONGO_URI, options);
    this.config = config;
  }

  public async connect(): Promise<any> {
    try {
      await this.client.connect();
      logger.info(`[mongoStore][connect] Successfully connected to MongoDB`);
      return Promise.resolve(this);
    } catch (error: any) {
      logger.error(`[mongoStore][connect] ${error.message}`);
      throw new Error(`[mongoStore][connect] ${error.message}`);
    }
  }

  public async insertOne(collection: string, doc: Document): Promise<any> {
    try {
      const response = await this.client.db(this.config.MONGO_DB).collection(collection).insertOne(doc);
      return Promise.resolve(response);
    } catch (error: any) {
      logger.error(`[mongoStore][insertOne] ${error.message}`);
    }
    return Promise.resolve({});
  }

  public async updateOne(collection: string, query: Filter<any>, doc: Document): Promise<any> {
    try {
      const response = await this.client.db(this.config.MONGO_DB).collection(collection).updateOne(query, doc, { upsert: true });
      return Promise.resolve(response);
    } catch (error: any) {
      logger.error(`[mongoStore][updateOne] ${error.message}`);
    }
    return Promise.resolve({});
  }

  public async findOne(collection: string, query: Filter<any>): Promise<any> {
    try {
      const response = await this.client.db(this.config.MONGO_DB).collection(collection).findOne(query);
      if (response === null || response === undefined) {
        return Promise.resolve({});
      }
      return Promise.resolve(response);
    } catch (error: any) {
      logger.error(`[mongoStore][findOne] ${error.message}`);
    }
    return Promise.resolve({});
  }

  public async findAll(collection: string, query: Filter<any>): Promise<any> {
    try {
      const response = await this.client.db(this.config.MONGO_DB).collection(collection).find(query).toArray();
      return Promise.resolve(response.length > 0 ? response : []);
    } catch (error: any) {
      logger.error(`[mongoStore][findAll] ${error.message}`);
    }
    return Promise.resolve([]);
  }

  public async insertMany(collection: string, docs: any[]): Promise<any> {
    try {
      const response = await this.client.db(this.config.MONGO_DB).collection(collection).insertMany(docs);
      return Promise.resolve(response);
    } catch (error: any) {
      logger.error(`[mongoStore][insertMany] ${error.message}`);
    }
    return Promise.resolve({});
  }

  public async aggregate(collection: string, query: Document[]): Promise<any> {
    try {
      const response = await this.client.db(this.config.MONGO_DB).collection(collection).aggregate(query).toArray();
      return Promise.resolve(response.length > 0 ? response : []);
    } catch (error: any) {
      logger.error(`[mongoStore][aggregate] ${error.message}`);
    }
    return Promise.resolve([]);
  }

  public async dropCollection(collection: string): Promise<any> {
    try {
      await this.client.db(this.config.MONGO_DB).collection(collection).drop();
      return Promise.resolve('Collection successfully deleted');
    } catch (error: any) {
      logger.error(`[mongoStore][dropCollection] ${error.message}`);
    }
    return Promise.resolve({});
  }

  public async createIndex(collection: string, keys: IndexSpecification, options: CreateIndexesOptions): Promise<any> {
    try {
      const response = await this.client.db(this.config.MONGO_DB).collection(collection).createIndex(keys, options);
      return Promise.resolve(response);
    } catch (error: any) {
      logger.error(`[mongoStore][createIndex] ${error.message}`);
    }
    return Promise.resolve({});
  }

  public async deleteMany(collection: string, query: Filter<any>): Promise<any> {
    try {
      await this.client.db(this.config.MONGO_DB).collection(collection).deleteMany(query);
      return Promise.resolve('Documents successfully deleted');
    } catch (error: any) {
      logger.error(`[mongoStore][deleteMany] ${error.message}`);
    }
    return Promise.resolve({});
  }
}
