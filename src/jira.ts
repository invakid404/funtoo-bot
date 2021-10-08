import JiraApi from 'jira-client';
import { Config } from './config';

export const getJiraClient = (config: Config): JiraApi =>
  new JiraApi({
    protocol: 'https',
    apiVersion: '2',
    strictSSL: true,
    host: config.jiraHost,
  });
