import amqplib from 'amqplib';
import axios from 'axios';
import { DockerRunner, RunSubmissionPayload, CustomRunPayload } from './docker/docker-runner';

const AMQP_URL = process.env.RABBITMQ_URL || 'amqp://root:rootpassword@localhost:5672';
const QUEUE_NAME = process.env.QUEUE_NAME || 'judge_queue';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://host.docker.internal:3000/api/v1/webhook/judge';

const JUDGE_SECRET = process.env.JUDGE_SECRET || 'default-judge-secret-key';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeJobMessage(content: Buffer): Record<string, unknown> {
  const message: unknown = JSON.parse(content.toString());
  if (!isRecord(message)) {
    throw new Error('Invalid judge message: expected an object');
  }

  const payload =
    'pattern' in message && 'data' in message ? message.data : message;
  if (!isRecord(payload)) {
    throw new Error('Invalid judge message: expected a job payload');
  }

  return payload;
}

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
            const payload = decodeJobMessage(msg.content);
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
    const headers = { 'x-judge-secret': JUDGE_SECRET };

    if (payload.is_custom) {
      const customPayload: CustomRunPayload = {
        language: payload.language,
        language_version: payload.language_version,
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
      }, { headers });
      
    } else {
      const submissionPayload: RunSubmissionPayload = {
        language: payload.language,
        language_version: payload.language_version,
        source_code: payload.source_code,
        time_limit: payload.time_limit,
        memory_limit: payload.memory_limit,
        test_cases: payload.test_cases || [],
      };
      
      const result = await DockerRunner.runSubmission(
        submissionPayload,
        async (progress) => {
          try {
            const response = await axios.post(
              `${WEBHOOK_URL}/progress`,
              { submission_id: payload.submission_id, ...progress },
              { headers },
            );
            console.log(
              `[Judge progress] Submission ${payload.submission_id}: ${progress.completed_tests}/${progress.total_tests} tests (HTTP ${response.status})`,
            );
          } catch (err: unknown) {
            const message = axios.isAxiosError(err)
              ? `${err.message}${err.response ? ` (HTTP ${err.response.status})` : ''}`
              : err instanceof Error
                ? err.message
                : String(err);
            console.error(
              `[!] Judge progress webhook failed for submission ${payload.submission_id} at ${progress.completed_tests}/${progress.total_tests}: ${message}`,
            );
          }
        },
      );
      
      await axios.post(WEBHOOK_URL, {
        is_custom: false,
        submission_id: payload.submission_id,
        status: result.status,
        execution_time: result.test_results.reduce((acc, curr) => Math.max(acc, curr.execution_time || 0), 0),
        memory_used: result.test_results.reduce((acc, curr) => Math.max(acc, curr.memory_used || 0), 0),
        test_results: result.test_results,
      }, { headers });
    }
  }
}
