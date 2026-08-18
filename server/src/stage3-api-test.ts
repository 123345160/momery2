/**
 * Stage 3 curl 替代测试脚本
 * 用 Node.js fetch 绕过 PowerShell 引号问题
 */

const BASE = 'http://localhost:3000/api';

async function req(method: string, path: string, body?: unknown) {
  const url = `${BASE}${path}`;
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const json = await res.json();
  return { status: res.status, json };
}

async function main() {
  let deckId = 0;
  let cardId = 0;

  // === Deck 模块 ===
  console.log('=== 1. GET /api/decks (empty) ===');
  console.log(await req('GET', '/decks'));

  console.log('\n=== 2. POST /api/decks (create) ===');
  const createRes = await req('POST', '/decks', { name: 'Test Deck', description: 'for testing' });
  console.log(createRes);
  deckId = createRes.json.data?.id ?? 1;

  console.log('\n=== 3. GET /api/decks (1 item) ===');
  console.log(await req('GET', '/decks'));

  console.log(`\n=== 4. GET /api/decks/${deckId} (detail) ===`);
  console.log(await req('GET', `/decks/${deckId}`));

  console.log(`\n=== 5. PUT /api/decks/${deckId} (update) ===`);
  console.log(await req('PUT', `/decks/${deckId}`, { name: 'Updated Deck', description: 'updated' }));

  // === Card 模块 ===
  console.log(`\n=== 6. POST /api/decks/${deckId}/cards (create) ===`);
  const cardRes = await req('POST', `/decks/${deckId}/cards`, { front: '1+1=?', back: '2' });
  console.log(cardRes);
  cardId = cardRes.json.data?.id ?? 1;

  console.log(`\n=== 7. GET /api/decks/${deckId}/cards (list) ===`);
  console.log(await req('GET', `/decks/${deckId}/cards`));

  console.log('\n=== 8. POST /api/cards/batch (batch create) ===');
  console.log(await req('POST', '/cards/batch', {
    deckId,
    cards: [
      { front: '2+2=?', back: '4' },
      { front: '3+3=?', back: '6' },
    ],
  }));

  console.log(`\n=== 9. PUT /api/cards/${cardId} (update) ===`);
  console.log(await req('PUT', `/cards/${cardId}`, { front: '1+1=?', back: 'equals 2' }));

  console.log(`\n=== 10. DELETE /api/cards/${cardId} (remove) ===`);
  console.log(await req('DELETE', `/cards/${cardId}`));

  console.log(`\n=== 11. DELETE /api/decks/${deckId} (remove) ===`);
  console.log(await req('DELETE', `/decks/${deckId}`));

  console.log('\n=== 12. GET /api/decks (empty after delete) ===');
  console.log(await req('GET', '/decks'));

  // === 错误场景 ===
  console.log('\n=== 13. POST /api/decks (empty name) ===');
  console.log(await req('POST', '/decks', { name: '' }));

  console.log('\n=== 14. POST /api/decks (name is number) ===');
  console.log(await req('POST', '/decks', { name: 123 }));

  console.log('\n=== 15. GET /api/decks/999 (not found) ===');
  console.log(await req('GET', '/decks/999'));

  console.log('\n=== 16. POST /api/cards/batch (empty array) ===');
  console.log(await req('POST', '/cards/batch', { deckId: 999, cards: [] }));

  console.log('\n=== 17. POST /api/decks/abc (invalid ID) ===');
  console.log(await req('POST', '/decks/abc/cards', { front: 'x', back: 'y' }));
}

main().catch(console.error);
