const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const appConfigPath = path.join(projectRoot, 'app.json');
const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8')).expo;
const expectedPackage = appConfig?.android?.package;
const configuredGoogleServicesFile = appConfig?.android?.googleServicesFile;

if (!expectedPackage) {
  throw new Error('Expo Android package is missing from app.json');
}

if (!configuredGoogleServicesFile) {
  throw new Error('android.googleServicesFile is missing from app.json');
}

const googleServicesPath = path.resolve(projectRoot, configuredGoogleServicesFile);
if (!googleServicesPath.startsWith(`${projectRoot}${path.sep}`)) {
  throw new Error('android.googleServicesFile must stay inside the mobile project');
}

const secretValue = process.env.GOOGLE_SERVICES_JSON?.trim();
if (secretValue) {
  fs.writeFileSync(googleServicesPath, `${secretValue}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
}

if (!fs.existsSync(googleServicesPath)) {
  throw new Error(
    'Firebase Android configuration is missing. Add the GOOGLE_SERVICES_JSON secret through the secure workspace/build flow.',
  );
}

let googleServices;
try {
  googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'));
} catch {
  throw new Error('Firebase Android configuration is not valid JSON');
}

const firebasePackageNames = (googleServices.client ?? [])
  .map((client) => client?.client_info?.android_client_info?.package_name)
  .filter(Boolean);

if (!firebasePackageNames.includes(expectedPackage)) {
  throw new Error(
    `Firebase Android package mismatch: expected ${expectedPackage}, found ${firebasePackageNames.join(', ') || 'none'}`,
  );
}

if (!googleServices.project_info?.project_id) {
  throw new Error('Firebase Android configuration is missing project_info.project_id');
}

fs.chmodSync(googleServicesPath, 0o600);
console.log(
  `Firebase Android configuration ready for ${expectedPackage} (${googleServices.project_info.project_id})`,
);