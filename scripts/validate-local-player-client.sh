#!/usr/bin/env bash
set -euo pipefail

cd /Users/dom111/Code/civ-clone/web-renderer-rewrite

npm run ts:compile
npm run test:contract -- local-player-client.contract.test.ts
npm run test:integration -- get-mandatory-actions
npm run test:integration -- submit-intent-success
npm run test:integration -- submit-intent-rejection
npm run test:integration -- submit-intent-errors
npm run test:unit -- intent-to-command.test.ts
npm run test:unit -- submission-lock.test.ts
npm run lint

