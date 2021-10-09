import { Probot } from 'probot';
import { getConfig } from './config';
import { getJiraClient } from './jira';
import { addLabel, removeLabel } from './labels';

export const pullRequests = (app: Probot): void => {
  app.on('pull_request', async (context) => {
    const config = await getConfig(context);

    const {
      badTicketLabel,
      commentMessage,
      enableClose,
      enableComment,
      titlePattern,
      validTicketStatuses,
    } = config.pullRequests;

    const hasBadTicketLabel = context.payload.pull_request.labels?.some(
      (label) => label.name === badTicketLabel,
    );

    const title = context.payload.pull_request.title;
    const { ticket: ticketName = '' } = titlePattern.exec(title)?.groups ?? {};

    const jiraClient = getJiraClient(config);

    try {
      const ticket = await jiraClient.findIssue(ticketName);

      if (validTicketStatuses.has(ticket?.fields?.status?.name)) {
        if (hasBadTicketLabel) {
          await removeLabel(context, badTicketLabel);
        }

        return;
      }
    } catch (error) {}

    if (!hasBadTicketLabel) {
      await addLabel(context, badTicketLabel);

      if (enableComment) {
        await context.octokit.issues.createComment(
          context.issue({ body: commentMessage }),
        );
      }
    }

    if (enableClose) {
      await context.octokit.pulls.update(
        context.pullRequest({ state: 'closed' }),
      );
    }
  });
};
