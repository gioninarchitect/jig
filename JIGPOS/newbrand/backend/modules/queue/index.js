// Queue Module - Bull Implementation - Max 200 lines
const Bull = require('bull');
const config = require('../../config');
const logger = require('../logger');

class QueueService {
  constructor() {
    this.queues = {};
    this.processors = {};
  }

  async initialize() {
    try {
      // Create queues
      this.queues.notification = new Bull('notification', {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password
        }
      });

      this.queues.email = new Bull('email', {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password
        }
      });

      this.queues.payment = new Bull('payment', {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password
        }
      });

      this.queues.order = new Bull('order', {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password
        }
      });

      this.queues.analytics = new Bull('analytics', {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password
        }
      });

      // Register processors
      await this.registerProcessors();

      logger.info('Queue service initialized');
      return true;
    } catch (error) {
      logger.error('Queue initialization error:', error);
      throw error;
    }
  }

  async registerProcessors() {
    // Notification processor
    this.queues.notification.process(async (job) => {
      const { notificationId } = job.data;
      const notificationService = require('../notification/service');
      return await notificationService.processNotification(notificationId);
    });

    // Email processor
    this.queues.email.process(async (job) => {
      const { template, to, data } = job.data;
      const emailService = require('../notification/email/service');
      return await emailService.send(template, to, data);
    });

    // Payment processor
    this.queues.payment.process(async (job) => {
      const { action, paymentId } = job.data;
      const paymentService = require('../payment/service');
      
      switch (action) {
        case 'verify':
          return await paymentService.verify(paymentId);
        case 'expire':
          return await paymentService.expirePayment(paymentId);
        default:
          throw new Error(`Unknown payment action: ${action}`);
      }
    });

    // Order processor
    this.queues.order.process(async (job) => {
      const { action, orderId } = job.data;
      const orderService = require('../order/service');
      
      switch (action) {
        case 'process':
          return await orderService.processOrder(orderId);
        case 'fulfillment':
          return await orderService.processFulfillment(orderId);
        case 'abandoned':
          return await orderService.checkAbandoned(orderId);
        default:
          throw new Error(`Unknown order action: ${action}`);
      }
    });

    // Analytics processor
    this.queues.analytics.process(async (job) => {
      const { event, data } = job.data;
      const analyticsService = require('../analytics/service');
      return await analyticsService.trackEvent(event, data);
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    Object.entries(this.queues).forEach(([name, queue]) => {
      queue.on('completed', (job, result) => {
        logger.info(`Job completed in ${name} queue`, {
          jobId: job.id,
          data: job.data
        });
      });

      queue.on('failed', (job, error) => {
        logger.error(`Job failed in ${name} queue`, {
          jobId: job.id,
          error: error.message,
          data: job.data
        });
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job stalled in ${name} queue`, {
          jobId: job.id,
          data: job.data
        });
      });
    });
  }

  async add(queueName, data, options = {}) {
    try {
      const queue = this.queues[queueName];
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const defaultOptions = {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      };

      const job = await queue.add(data, { ...defaultOptions, ...options });
      
      logger.debug(`Job added to ${queueName} queue`, {
        jobId: job.id,
        data
      });

      return job;
    } catch (error) {
      logger.error('Queue add error:', error);
      throw error;
    }
  }

  async addBulk(queueName, jobs) {
    try {
      const queue = this.queues[queueName];
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const bulkJobs = jobs.map(job => ({
        data: job.data,
        opts: job.options || {}
      }));

      return await queue.addBulk(bulkJobs);
    } catch (error) {
      logger.error('Queue bulk add error:', error);
      throw error;
    }
  }

  async getJob(queueName, jobId) {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return await queue.getJob(jobId);
  }

  async getQueueStats(queueName) {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.getPausedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused
    };
  }

  async clean(queueName, grace = 0) {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.clean(grace);
  }

  async close() {
    await Promise.all(
      Object.values(this.queues).map(queue => queue.close())
    );
    logger.info('All queues closed');
  }

  async pause(queueName) {
    const queue = this.queues[queueName];
    if (queue) {
      await queue.pause();
    }
  }

  async resume(queueName) {
    const queue = this.queues[queueName];
    if (queue) {
      await queue.resume();
    }
  }
}

module.exports = new QueueService();