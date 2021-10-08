// You can import your modules
// import index from '../src/index'

import nock from 'nock';
// Requiring our app implementation
import funtooBot from '../src';
import { Probot, ProbotOctokit } from 'probot';
// Requiring our fixtures
import payload from './fixtures/pull_request.opened.json';

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const privateKey = fs.readFileSync(
  path.join(__dirname, 'fixtures/mock-cert.pem'),
  'utf-8',
);

const validTicketStatuses = ['Ready to Fix', 'In Progress'];

const badTicketLabel = 'bad';
const labelCreateBody = { name: badTicketLabel };
const labelsAddBody = { labels: [badTicketLabel] };

const config = yaml.dump({
  badTicketLabel,
  validTicketStatuses,
});

describe('My Probot app', () => {
  let probot: any;

  beforeEach(() => {
    nock.disableNetConnect();
    probot = new Probot({
      appId: 123,
      privateKey,
      // disable request throttling and retries for testing
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });

    // Load our app into probot
    probot.load(funtooBot);
  });

  test('adds label when a pull request is opened with a bad title', async (done) => {
    const mock = nock(/(github\.com|bugs\.funtoo\.org)/)
      // Return an issue, which is in an invalid state
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
      .reply(200)

      // Test that the config is being parsed correctly
      .get('/repos/invakid404/funtoo-bot/contents/.github%2Ffuntoo-bot.yml')
      .reply(200, config);

    // Receive a webhook event
    await probot.receive(payload);

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
