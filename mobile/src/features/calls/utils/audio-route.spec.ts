import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AudioPort } from 'expo-callkit-telecom';

import { readAudioRoute } from './audio-route';

const earpiece: AudioPort = { portType: 'builtInReceiver', portName: 'Receiver', uid: 'receiver' };
const speaker: AudioPort = { portType: 'builtInSpeaker', portName: 'Speaker', uid: 'speaker' };
const airPods: AudioPort = { portType: 'bluetoothHFP', portName: 'AirPods', uid: 'airpods' };

test('the active private output is what a "not speaker" choice returns to', () => {
  const route = readAudioRoute({ inputs: [], outputs: [airPods] });

  assert.deepEqual(route.current, { kind: 'bluetooth', name: 'AirPods' });
  assert.deepEqual(route.private, { kind: 'bluetooth', name: 'AirPods' });
});

test('on speaker, iOS reports no private output, so none is invented', () => {
  const route = readAudioRoute({ inputs: [], outputs: [speaker] });

  assert.equal(route.current?.kind, 'speaker');
  assert.equal(route.private, undefined);
});

test('Android endpoints name the headset the library would pick over the earpiece', () => {
  const route = readAudioRoute({ inputs: [], outputs: [speaker] }, [speaker, earpiece, airPods]);

  assert.deepEqual(route.private, { kind: 'bluetooth', name: 'AirPods' });
});
