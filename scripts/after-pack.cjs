// EchoTerm — electron-builder afterPack hook
// electron-builder only writes app-update.yml for NSIS targets, so the
// portable exe and portable zip (which must run the same update *check* as the
// installed build, but never auto-install) get the feed config injected here,
// plus a marker file that identifies the portable/zip shape at runtime.
// The NSIS installer carries the marker too, but build-assets/installer.nsh
// deletes it during install so an installed copy is never mistaken for portable.
'use strict';

const fs = require('fs');
const path = require('path');

module.exports = async function afterPack(context) {
  const { appOutDir, electronPlatformName, packager, targets } = context;
  if (electronPlatformName !== 'win32') return;

  // Only the portable exe and the portable zip need this — NSIS already gets
  // its own app-update.yml from electron-builder.
  const isPortableShape = targets.some((t) => t.name === 'portable' || t.name === 'zip');
  if (!isPortableShape) return;

  const publish = (packager.config && packager.config.publish) || [];
  const github = publish.find((p) => p && p.provider === 'github');
  if (!github) return;

  const resourcesDir = path.join(appOutDir, 'resources');
  fs.mkdirSync(resourcesDir, { recursive: true });

  // Replicate the app-update.yml electron-builder writes for NSIS so
  // electron-updater can resolve the GitHub feed.
  const yaml = [
    'provider: ' + github.provider,
    'owner: ' + github.owner,
    'repo: ' + github.repo,
    'updaterCacheDirName: ' + packager.appInfo.updaterCacheDirName,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(resourcesDir, 'app-update.yml'), yaml);

  // Marker consumed at runtime by UpdateController.isPortableBuild().
  fs.writeFileSync(path.join(resourcesDir, 'echoterm-portable'), '');
};
