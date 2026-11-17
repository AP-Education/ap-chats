import assert from 'node:assert/strict';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';

import { expoMultipart, type ExpoMultipartBody, signPart } from './expo-response';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

interface ParsedPart {
  headers: Map<string, string>;
  content: string;
}

function parse({ contentType, body }: ExpoMultipartBody): ParsedPart[] {
  const boundary = /boundary=(.+)$/u.exec(contentType)?.[1];
  assert.ok(boundary);
  const end = `--${boundary}--\r\n`;
  assert.ok(body.endsWith(end));
  return body
    .slice(0, -end.length)
    .split(`--${boundary}\r\n`)
    .filter(Boolean)
    .map((part) => {
      const split = part.indexOf('\r\n\r\n');
      const headers = new Map(
        part
          .slice(0, split)
          .split('\r\n')
          .map((line) => {
            const at = line.indexOf(': ');
            return [line.slice(0, at), line.slice(at + 2)] as const;
          }),
      );
      return { headers, content: part.slice(split + 4, -2) };
    });
}

function verifies(content: string, header: string | undefined): boolean {
  const signature = /^sig="([^"]+)", keyid="main"$/u.exec(header ?? '')?.[1];
  assert.ok(signature, header);
  return createVerify('RSA-SHA256').update(content).verify(publicKey, signature, 'base64');
}

test('signs a body so the embedded certificate key verifies it', () => {
  const body = JSON.stringify({ id: 'u1' });
  assert.ok(verifies(body, signPart(body, privateKey)));
});

test('writes each part with its name and JSON body', () => {
  const [manifest, extensions, ...rest] = parse(
    expoMultipart([
      { name: 'manifest', body: { id: 'u1' } },
      { name: 'extensions', body: { assetRequestHeaders: {} } },
    ]),
  );

  assert.ok(manifest && extensions);
  assert.equal(rest.length, 0);
  assert.equal(manifest.headers.get('content-disposition'), 'form-data; name="manifest"');
  assert.deepEqual(JSON.parse(manifest.content), { id: 'u1' });
  assert.equal(manifest.headers.get('expo-signature'), undefined);
  assert.equal(extensions.headers.get('content-disposition'), 'form-data; name="extensions"');
});

test('signs the exact bytes of manifest and directive parts, not extensions', () => {
  const [directive, extensions] = parse(
    expoMultipart(
      [
        { name: 'directive', body: { type: 'noUpdateAvailable' } },
        { name: 'extensions', body: {} },
      ],
      (body) => signPart(body, privateKey),
    ),
  );

  assert.ok(directive && extensions);
  assert.ok(verifies(directive.content, directive.headers.get('expo-signature')));
  assert.equal(extensions.headers.get('expo-signature'), undefined);
});
