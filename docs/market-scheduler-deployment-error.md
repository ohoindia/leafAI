# Market scheduler deployment permissions

The October 13, 2026 deployment failed while creating `ApiMarketImportRole`:
`iam:CreateRole` was denied. CloudFormation reported `UnauthorizedTaggingOperation`,
but the embedded error explicitly identifies the missing `iam:CreateRole` permission.
The `leafai` stack finished in `UPDATE_ROLLBACK_COMPLETE`; the attempted Lambda
update was rolled back.

`server/template.yaml` contains a SAM `ScheduleV2` event. SAM creates an EventBridge
Scheduler execution role and schedule for this event. The deployment identity needs
permission to manage those resources and pass the execution role to Scheduler.
`CAPABILITY_IAM` acknowledges role creation; it does not grant these permissions.

## Apply the supplemental policy

1. In GitHub repository **Settings > Secrets and variables > Actions > Variables**,
   find `AWS_DEPLOY_ROLE_ARN`. This is the role assumed by
   `.github/workflows/deploy-server.yml`.
2. Check the CloudFormation `leafai` stack's IAM service role. If one is configured,
   apply the policy to that service role. Otherwise, apply it to the GitHub deployment
   role identified above. Do not apply it to the API Lambda execution role.
3. With an AWS identity authorized to manage IAM, open that role in
   **IAM > Roles > Permissions > Add permissions > Create inline policy > JSON**.
   Paste [the supplemental policy](../deploy/market-scheduler-deploy-policy.json)
   and save it as `LeafAiMarketSchedulerDeploy`.
4. Re-run the failed GitHub Actions deployment job. The stack can be updated from
   `UPDATE_ROLLBACK_COMPLETE`; deleting the stack is unnecessary.

This policy adds scheduler deployment permissions to the role's existing deployment
permissions. It is scoped to account `640168439195`, stack `leafai`, region
`ap-south-1`, and the `ApiMarketImport` schedule in the default schedule group. Adjust these values if deploying
elsewhere. Existing permissions boundaries or organization policies must also allow
these actions.

The subsequent deployment log confirmed that role creation succeeded, but
`scheduler:GetSchedule` was denied on
`arn:aws:scheduler:ap-south-1:640168439195:schedule/default/ApiMarketImport`.
The original supplemental policy used `schedule/default/leafai-*`, which did not
match SAM's schedule name. Use the corrected policy file and replace the existing
inline policy on `GitHubOhoCustomerApiDeploy`, then rerun the deployment.

Setting `MarketScheduleEnabled=false` disables invocation but still creates the
schedule and its role with the current template, so it does not avoid this error.

References: [CloudFormation service roles](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-iam-servicerole.html),
[Scheduler permissions](https://docs.aws.amazon.com/service-authorization/latest/reference/list_scheduler.html).
