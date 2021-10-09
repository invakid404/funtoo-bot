import nock from 'nock';

// Requiring our app implementation
import funtooBot from '../src';
import { Probot, ProbotOctokit } from 'probot';
import { WebhookEvent } from '@octokit/webhooks';

// Requiring our fixtures
import pullRequestEvent from './fixtures/pull_request.opened.json';

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const privateKey = fs.readFileSync(
  path.join(__dirname, 'fixtures/mock-cert.pem'),
  'utf-8',
);

const badTicketLabel = 'bad';

const labelCreateBody = { name: badTicketLabel };
const labelsAddBody = { labels: [badTicketLabel] };

const pullRequestCloseBody = { state: 'closed' };

const getBaseMock = (config: Record<string, unknown>) =>
  // Mock both GitHub and Jira APIs
  nock(/(github\.com|bugs\.funtoo\.org)/)
    // Return an issue, which is in Intake
    .get(/rest\/api\/2\/issue\/FL-1337.*/)
    .reply(200, {
      fields: {
        status: {
          name: 'Intake',
        },
      },
    })

    // Test that we correctly return a test token
    .post('/app/installations/1/access_tokens')
    .reply(200, {
      token: 'test',
      permissions: {
        pull_requests: 'write',
      },
    })

    // Mock config
    .get('/repos/invakid404/funtoo-bot/contents/.github%2Ffuntoo-bot.yml')
    .reply(200, yaml.dump(config));

describe('Pull requests', () => {
  let probot: Probot;

  beforeEach(() => {
    nock.disableNetConnect();
    probot = new Probot({
      appId: 123,
      privateKey,
      // Disable request throttling and retries for testing
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });

    // Load our app into probot
    probot.load(funtooBot);
  });

  test('does nothing when a pull request is opened with a valid title', async (done) => {
    const mock = getBaseMock({
      pullRequests: {
        enableLabel: true,
        enableClose: false,
        badTicketLabel,
        // Consider Intake as valid
        validTicketStatuses: ['Intake'],
      },
    });

    // Receive a webhook event
    await probot.receive(pullRequestEvent as WebhookEvent);

    done(expect(mock.pendingMocks()).toStrictEqual([]));
  });

  test('adds label when a pull request is opened with a bad title', async (done) => {
    const mock = getBaseMock({
      pullRequests: {
        enableLabel: true,
        enableClose: false,
        badTicketLabel,
        validTicketStatuses: ['In Progress', 'Ready to Fix'],
      },
    })
      // Test that the bad ticket label is created
      .post('/repos/invakid404/funtoo-bot/labels', (body: any) => {
        expect(body).toMatchObject(labelCreateBody);

        return true;
      })
      .reply(200)

      // Test that the bad ticket label is added
      .post('/repos/invakid404/funtoo-bot/issues/1/labels', (body: any) => {
        done(expect(body).toMatchObject(labelsAddBody));

        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive(pullRequestEvent as WebhookEvent);

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test('closes pull request when it is opened with a bad title', async (done) => {
    const mock = getBaseMock({
      pullRequests: {
        enableLabel: false,
        enableClose: true,
      },
    })
      // Test that pull request is being closed
      .patch('/repos/invakid404/funtoo-bot/pulls/1', (body: any) => {
        done(expect(body).toMatchObject(pullRequestCloseBody));

        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive(pullRequestEvent as WebhookEvent);

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});