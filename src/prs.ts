import { Probot } from 'probot';
import { getConfig } from './config';
import { getJiraClient } from './jira';
import { addLabel, removeLabel } from './labels';

export const pullRequests = (app: Probot): void => {
  app.on('pull_request', async (context) => {
    const config = await getConfig(context);

    const hasBadTicketLabel = context.payload.pull_request.labels.some(
      (label) => label.name === config.badTicketLabel,
    );

    const title = context.payload.pull_request.title;
    const { ticket: ticketName = '' } =
      config.prTitlePattern.exec(title)?.groups ?? {};

    const jiraClient = getJiraClient(config);

    try {
      const ticket = await jiraClient.findIssue(ticketName);

      if (config.validTicketStatuses.has(ticket?.fields?.status?.name)) {
        hasBadTicketLabel &&
          (await removeLabel(context, config.badTicketLabel));

        return;
      }
    } catch (error) {}

    hasBadTicketLabel || (await addLabel(context, config.badTicketLabel));
  });
};
