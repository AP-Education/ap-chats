import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runtimeOfBuild } from './eas-builds';

const builds = [
  { appBuildVersion: '12', runtime: { version: 'aaa' } },
  { appBuildVersion: '11', runtime: { version: 'bbb' } },
];

test('takes the runtime EAS recorded for the build', () => {
  assert.equal(runtimeOfBuild(builds, 12), 'aaa');
});

test('refuses a build EAS does not know or that disagrees with itself', () => {
  assert.throws(() => runtimeOfBuild(builds, 13), /no finished build 13/u);
  assert.throws(
    () => runtimeOfBuild([...builds, { appBuildVersion: '12', runtime: { version: 'ccc' } }], 12),
    /disagree/u,
  );
  assert.throws(() => runtimeOfBuild({ error: 'x' }, 12), /did not list/u);
});
