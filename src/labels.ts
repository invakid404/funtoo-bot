import { Context } from 'probot';

export const addLabel = async (
  context: Context,
  label: string,
): Promise<void> => {
  try {
    await ensureLabelExists(context, label);

    await context.octokit.issues.addLabels(context.issue({ labels: [label] }));
  } catch (error) {
    console.error(error);
  }
};

export const removeLabel = async (
  context: Context,
  label: string,
): Promise<void> => {
  try {
    await context.octokit.issues.removeLabel(context.issue({ name: label }));
  } catch (error) {
    console.error(error);
  }
};

export const ensureLabelExists = async (
  context: Context,
  label: string,
): Promise<void> => {
  const labelQuery = context.repo({ name: label });

  try {
    await context.octokit.issues.getLabel(labelQuery);
  } catch (error) {
    await context.octokit.issues.createLabel(labelQuery);
  }
};
