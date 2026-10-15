import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract = JSON.parse(
  readFileSync("config/kubernetes/workload-identity.v1.json", "utf8"),
);
const values = readFileSync("infra/helm/cgn-service/values.yaml", "utf8");
const schema = JSON.parse(
  readFileSync("infra/helm/cgn-service/values.schema.json", "utf8"),
);
const deployment = readFileSync(
  "infra/helm/cgn-service/templates/deployment.yaml",
  "utf8",
);
const serviceAccount = readFileSync(
  "infra/helm/cgn-service/templates/serviceaccount.yaml",
  "utf8",
);
const helpers = readFileSync(
  "infra/helm/cgn-service/templates/_helpers.tpl",
  "utf8",
);
const irsaFixture = readFileSync(
  "tests/fixtures/helm/irsa-template-smoke.yaml",
  "utf8",
);

assert.equal(contract.schema, "cgn.workload-identity.v1");
assert.equal(contract.ticket, "CGN-61");
assert.equal(contract.chartPath, "infra/helm/cgn-service");

assert.equal(contract.defaults.createDedicatedServiceAccount, true);
assert.equal(contract.defaults.automountServiceAccountToken, false);
assert.equal(contract.defaults.defaultServiceAccountFallbackAllowed, false);

assert.equal(contract.awsIrsa.patternOnly, true);
assert.equal(contract.awsIrsa.enabledByDefault, false);
assert.equal(contract.awsIrsa.annotationKey, "eks.amazonaws.com/role-arn");
assert.equal(contract.awsIrsa.roleArnRequiredWhenEnabled, true);
assert.equal(contract.awsIrsa.chartMustOwnAnnotatedServiceAccount, true);

assert.ok(schema.required.includes("serviceAccount"));
assert.ok(schema.required.includes("workloadIdentity"));
assert.equal(
  schema.properties.serviceAccount.properties.automountServiceAccountToken
    .const,
  false,
);
const annotations = schema.properties.serviceAccount.properties.annotations;
assert.equal(annotations.propertyNames.not.const, "eks.amazonaws.com/role-arn");
const irsa = schema.properties.workloadIdentity.properties.awsIrsa;
assert.match(irsa.properties.roleArn.pattern, /arn:aws:iam/);

assert.ok(values.includes("serviceAccount:\n  create: true"));
assert.ok(values.includes("automountServiceAccountToken: false"));
assert.ok(values.includes("awsIrsa:\n    enabled: false"));
assert.doesNotMatch(values, /arn:aws:iam::[0-9]{12}:role\//);

assert.match(deployment, /serviceAccountName:/);
assert.match(deployment, /automountServiceAccountToken:/);
assert.match(helpers, /define "cgn-service\.serviceAccountName"/);
assert.match(helpers, /serviceAccount\.name is required/);

assert.match(serviceAccount, /kind:\s*ServiceAccount/);
assert.match(serviceAccount, /eks\.amazonaws\.com\/role-arn/);
assert.match(serviceAccount, /workloadIdentity\.awsIrsa\.roleArn is required/);
assert.match(serviceAccount, /workloadIdentity\.awsIrsa requires/);
assert.doesNotMatch(serviceAccount, /kind:\s*Secret/i);
assert.doesNotMatch(serviceAccount, /accessKey|secretAccessKey|password/i);

assert.match(
  irsaFixture,
  /arn:aws:iam::123456789012:role\/cgn-irsa-smoke/,
);
assert.match(irsaFixture, /automountServiceAccountToken:\s*false/);

assert.equal(
  contract.failureBehavior.externalServiceAccountWithoutName,
  "fail-helm-render",
);
assert.equal(contract.failureBehavior.irsaWithoutRoleArn, "fail-helm-render");
assert.equal(
  contract.failureBehavior.irsaOnExternalServiceAccount,
  "fail-helm-render",
);
assert.equal(
  contract.failureBehavior.serviceAccountTokenAutomountTrue,
  "fail-values-schema",
);
assert.equal(
  contract.failureBehavior.rawIrsaAnnotationBypass,
  "fail-values-schema",
);

assert.equal(contract.safety.noAwsResourceCreation, true);
assert.equal(contract.safety.noIamRoleCreation, true);
assert.equal(contract.safety.noCloudProviderActivation, true);
assert.equal(contract.safety.noCommittedRoleArn, true);
assert.equal(contract.safety.noCredential, true);
assert.equal(contract.safety.noSecret, true);
assert.equal(contract.safety.noPaidResource, true);
assert.equal(contract.safety.noProductionDeployment, true);

console.log("CGN-61 ServiceAccount and IRSA policy pattern is valid.");
