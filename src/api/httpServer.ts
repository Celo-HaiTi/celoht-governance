import { createHash, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { z } from 'zod';
import { ProposalService } from '../application/proposalService.js';
import { VotingService } from '../application/votingService.js';
import type { Authenticator, IdempotencyStore } from '../application/securityPorts.js';
import type { ProposalRepository } from '../application/ports.js';
import { CreateProposalInputSchema, CastVoteInputSchema, ListProposalsQuerySchema } from '../schemas/proposal.schema.js';
import { GovernanceError } from '../errors/GovernanceError.js';
import { assertVerifiedSepoliaConfiguration } from '../infrastructure/contracts/verifiedDeployment.js';

const MAX_BODY_BYTES = 1_048_576;
const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export interface GovernanceHttpDependencies {
  proposals: ProposalRepository;
  proposalService: ProposalService;
  votingService: VotingService;
  auth: Authenticator;
  idempotency: IdempotencyStore;
  ready?: () => Promise<void>;
}

export function createGovernanceHttpServer(dependencies: GovernanceHttpDependencies): Server {
  return createServer((request, response) => {
    void (async (): Promise<void> => {
    const requestId = request.headers['x-request-id']?.toString() || randomUUID();
    const correlationId = request.headers['x-correlation-id']?.toString() || requestId;
    response.setHeader('x-request-id', requestId);
    response.setHeader('x-correlation-id', correlationId);
    response.setHeader('x-content-type-options', 'nosniff');
    response.setHeader('x-frame-options', 'DENY');
    response.setHeader('referrer-policy', 'no-referrer');
    response.setHeader('content-security-policy', "default-src 'none'");
    response.setHeader('access-control-allow-origin', process.env.CELOHT_ALLOWED_ORIGIN || 'null');
    response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    response.setHeader('access-control-allow-headers', 'authorization,content-type,idempotency-key,x-correlation-id,x-request-id');

    try {
      if (request.method === 'OPTIONS') return send(response, 204, null);
      const url = new URL(request.url || '/', 'http://localhost');
      if (request.method === 'GET' && url.pathname === '/health') return send(response, 200, { status: 'ok' });
      if (request.method === 'GET' && url.pathname === '/ready') {
        assertVerifiedSepoliaConfiguration(process.env);
        await dependencies.ready?.();
        return send(response, 200, { status: 'ready' });
      }
      if (request.method === 'GET' && url.pathname === '/api/v1/governance/proposals') {
        const parsedQuery = ListProposalsQuerySchema.parse({
          ...Object.fromEntries(url.searchParams),
          limit: url.searchParams.get('limit') ?? undefined,
        });
        const query = {
          limit: parsedQuery.limit,
          ...(parsedQuery.status ? { status: parsedQuery.status } : {}),
          ...(parsedQuery.proposalType ? { proposalType: parsedQuery.proposalType } : {}),
          ...(parsedQuery.proposerId ? { proposerId: parsedQuery.proposerId } : {}),
          ...(parsedQuery.cursor ? { cursor: parsedQuery.cursor } : {}),
        };
        return send(response, 200, await dependencies.proposals.list(query));
      }
      const proposalMatch = url.pathname.match(/^\/api\/v1\/governance\/proposals\/([^/]+)$/);
      if (request.method === 'GET' && proposalMatch?.[1]) {
        const proposal = await dependencies.proposals.getById(proposalMatch[1]);
        if (!proposal) throw new GovernanceError('PROPOSAL_NOT_FOUND', 'Proposal not found', 404);
        return send(response, 200, proposal);
      }
      if (request.method !== 'POST') return send(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });

      const actor = await dependencies.auth.authenticate(request.headers.authorization);
      const body = await readJson(request);
      const idempotencyKey = request.headers['idempotency-key']?.toString();
      const operation = `${request.method} ${url.pathname}`;
      const run = <T>(action: () => Promise<T>): Promise<T> => {
        if (!idempotencyKey) throw new GovernanceError('VALIDATION_ERROR', 'Idempotency-Key is required for mutations', 422);
        return dependencies.idempotency.execute({
          key: idempotencyKey,
          actorId: actor.id,
          operation,
          requestHash: createHash('sha256').update(JSON.stringify(body)).digest('hex'),
          action,
        });
      };

      if (url.pathname === '/api/v1/governance/proposals') {
        const input = CreateProposalInputSchema.parse({ ...body, proposerId: actor.id });
        return send(response, 201, await run(() => dependencies.proposalService.createProposal(input, correlationId)));
      }
      const voteMatch = url.pathname.match(/^\/api\/v1\/governance\/proposals\/([^/]+)\/vote$/);
      if (voteMatch?.[1]) {
        const input = CastVoteInputSchema.parse({ ...body, proposalId: voteMatch[1], memberId: actor.id });
        return send(response, 201, await run(() => dependencies.votingService.castVote(input, correlationId)));
      }
      const submitMatch = url.pathname.match(/^\/api\/v1\/governance\/proposals\/([^/]+)\/submit$/);
      const submitProposalId = submitMatch?.[1];
      if (submitProposalId) return send(response, 200, await run(() => dependencies.proposalService.submitProposal(submitProposalId, actor.id, correlationId)));
      const reviewMatch = url.pathname.match(/^\/api\/v1\/governance\/proposals\/([^/]+)\/review$/);
      const reviewProposalId = reviewMatch?.[1];
      if (reviewProposalId) return send(response, 200, await run(() => dependencies.proposalService.beginReview(reviewProposalId, actor.id, correlationId)));
      const activateMatch = url.pathname.match(/^\/api\/v1\/governance\/proposals\/([^/]+)\/activate$/);
      const activateProposalId = activateMatch?.[1];
      if (activateProposalId) {
        const votingPeriodSeconds = z.object({ votingPeriodSeconds: z.number().int().positive() }).parse(body).votingPeriodSeconds;
        return send(response, 200, await run(() => dependencies.proposalService.activateForVoting(activateProposalId, actor.id, votingPeriodSeconds, correlationId)));
      }
      const quorumMatch = url.pathname.match(/^\/api\/v1\/governance\/proposals\/([^/]+)\/quorum$/);
      const quorumProposalId = quorumMatch?.[1];
      if (quorumProposalId) return send(response, 200, await run(() => dependencies.votingService.computeQuorum(quorumProposalId, correlationId)));
      const approveMatch = url.pathname.match(/^\/api\/v1\/governance\/proposals\/([^/]+)\/approve$/);
      const approveProposalId = approveMatch?.[1];
      if (approveProposalId) return send(response, 200, await run(() => dependencies.proposalService.approveProposal(approveProposalId, actor.id, correlationId)));
      const rejectMatch = url.pathname.match(/^\/api\/v1\/governance\/proposals\/([^/]+)\/reject$/);
      const rejectProposalId = rejectMatch?.[1];
      if (rejectProposalId) {
        const reason = z.object({ reason: z.string().min(10).max(2000) }).parse(body).reason;
        return send(response, 200, await run(() => dependencies.proposalService.rejectProposal(rejectProposalId, actor.id, reason, correlationId)));
      }
      const queueMatch = url.pathname.match(/^\/api\/v1\/governance\/proposals\/([^/]+)\/queue$/);
      const queueProposalId = queueMatch?.[1];
      if (queueProposalId) return send(response, 200, await run(() => dependencies.proposalService.queueProposal(queueProposalId, actor.id, correlationId)));
      const cancelMatch = url.pathname.match(/^\/api\/v1\/governance\/proposals\/([^/]+)\/cancel$/);
      const cancelProposalId = cancelMatch?.[1];
      if (cancelProposalId) {
        const reason = z.object({ reason: z.string().min(10).max(2000) }).parse(body).reason;
        return send(response, 200, await run(() => dependencies.proposalService.cancelProposal(cancelProposalId, actor.id, reason, correlationId)));
      }
      const executeMatch = url.pathname.match(/^\/api\/v1\/governance\/proposals\/([^/]+)\/execute$/);
      const executeProposalId = executeMatch?.[1];
      if (executeProposalId) {
        const txHash = z.object({ executionTxHash: z.string() }).parse(body).executionTxHash;
        return send(response, 200, await run(() => dependencies.proposalService.recordExecution(executeProposalId, actor.id, txHash, correlationId)));
      }
      return send(response, 404, { error: { code: 'NOT_FOUND', message: 'Route not found' } });
    } catch (error) {
      const governanceError = error instanceof GovernanceError ? error : new GovernanceError('VALIDATION_ERROR', 'Request could not be processed', 400);
      return send(response, governanceError.httpStatus, { error: { code: governanceError.code, message: governanceError.message, details: governanceError.details } });
    }
    })();
  });
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, body === null ? undefined : jsonHeaders);
  if (body !== null) response.end(JSON.stringify(body)); else response.end();
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk as Uint8Array);
    size += buffer.byteLength;
    if (size > MAX_BODY_BYTES) throw new GovernanceError('VALIDATION_ERROR', 'Request body is too large', 413);
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new GovernanceError('VALIDATION_ERROR', 'JSON object body required', 422);
  return parsed as Record<string, unknown>;
}
