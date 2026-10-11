import amqplib from 'amqplib';
import axios from 'axios';
import { DockerRunner, RunSubmissionPayload, CustomRunPayload } from './docker/docker-runner';

const AMQP_URL = process.env.RABBITMQ_URL || 'amqp://root:rootpassword@localhost:5672';
const QUEUE_NAME = process.env.QUEUE_NAME || 'judge_queue';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://host.docker.internal:3000/api/v1/webhook/judge';

export class JudgeConsumer {
  static async start() {
    try {
      const conn = await amqplib.connect(AMQP_URL);
      const ch = await conn.createChannel();
      await ch.assertQueue(QUEUE_NAME, { durable: true });

      console.log(`[*] Waiting for messages in ${QUEUE_NAME}. To exit press CTRL+C`);

      ch.consume(QUEUE_NAME, async (msg) => {
        if (msg !== null) {
          try {
            const payload = JSON.parse(msg.content.toString());
            console.log(`[x] Received job for ${payload.is_custom ? 'custom run' : 'submission'} (ID: ${payload.submission_id || payload.session_id})`);
            
            await this.processJob(payload);
            
            ch.ack(msg);
          } catch (err: any) {
            console.error(`[!] Error processing message: ${err.message}`);
            ch.nack(msg, false, false); // Do not requeue for now
          }
        }
      });
    } catch (error) {
      console.error(`[!] Failed to connect to RabbitMQ: ${error}`);
      setTimeout(() => this.start(), 5000); // Retry
    }
  }

  private static async processJob(payload: any) {
    if (payload.is_custom) {
      const customPayload: CustomRunPayload = {
        language: payload.language,
        source_code: payload.source_code,
        custom_input: payload.custom_input || '',
      };
      
      const result = await DockerRunner.runCustom(customPayload);
      
      await axios.post(WEBHOOK_URL, {
        is_custom: true,
        session_id: payload.session_id,
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
        execution_time: result.execution_time,
        memory_used: result.memory_used,
      }).catch(err => console.error(`[!] Webhook failed: ${err.message}`));
      
    } else {
      const submissionPayload: RunSubmissionPayload = {
        language: payload.language,
        source_code: payload.source_code,
        time_limit: payload.time_limit,
        memory_limit: payload.memory_limit,
        test_cases: payload.test_cases || [],
      };
      
      const result = await DockerRunner.runSubmission(submissionPayload);
      
      await axios.post(WEBHOOK_URL, {
        is_custom: false,
        submission_id: payload.submission_id,
        status: result.status,
        execution_time: result.test_results.reduce((acc, curr) => Math.max(acc, curr.execution_time || 0), 0),
        memory_used: result.test_results.reduce((acc, curr) => Math.max(acc, curr.memory_used || 0), 0),
        test_results: result.test_results,
      }).catch(err => console.error(`[!] Webhook failed: ${err.message}`));
    }
  }
}
