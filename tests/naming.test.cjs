const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const registry = new Map();
class LitElement {}
LitElement.prototype.html = (strings, ...values) => ({ strings, values });
LitElement.prototype.css = (strings, ...values) => ({ strings, values, cssText: strings.join('') });
const window = { LitElement };
vm.runInNewContext(fs.readFileSync('modular-person-entity-card.js', 'utf8'), {
  window, customElements: { get: name => registry.get(name), define: (name, cls) => registry.set(name, cls) },
  console, requestAnimationFrame() {},
});
const Card = registry.get('modular-person-entity-card');
const person = { entity_id: 'person.alex', state: 'Workshop', attributes: { friendly_name: 'Legacy Alex' } };
const zone = { entity_id: 'zone.old_slug', state: '0', attributes: { friendly_name: 'Old zone', icon: 'mdi:garage' } };
function setup(formatEntityName) {
  const card = new Card();
  card.config = { entity: person.entity_id };
  card.hass = { states: { [person.entity_id]: person, [zone.entity_id]: zone }, entities: { [zone.entity_id]: { name: 'Workshop' } }, ...(formatEntityName && { formatEntityName }) };
  return card;
}
test('uses contextual formatter for person and zone, matching registry names', () => {
  const calls = [];
  const card = setup((entity, parts) => { calls.push(Array.from(parts, p => p.type).join(',')); return entity === person ? 'Context Alex' : 'The Workshop'; });
  assert.equal(card._getEntityDisplayName(person), 'Context Alex');
  assert.equal(card._getStateDescription(person), 'The Workshop');
  assert.equal(card._getStateIcon(person), 'mdi:garage');
  assert.equal(card._getZoneEntity('The Workshop'), zone);
  assert.ok(calls.every(value => value === 'parent_device,device,entity'));
});
test('keeps legacy names, ID and state fallbacks when formatter unavailable', () => {
  const card = setup();
  assert.equal(card._getEntityDisplayName(person), 'Legacy Alex');
  assert.equal(card._getZoneEntity('Old zone'), zone);
  assert.equal(card._getStateDescription(person), 'Old zone');
  assert.equal(card._getEntityDisplayName({ entity_id: 'person.no_name', attributes: {} }), 'person.no_name');
  assert.equal(card._getStateDescription({ state: 'elsewhere' }), 'Elsewhere');
});
test('configured person name takes precedence', () => {
  const card = setup(() => 'Formatted');
  card.config.name = 'My name';
  const rendered = card.render();
  function contains(result, target) { return !!result && (result === target || (typeof result === 'object' && Array.isArray(result.values) && result.values.some(value => contains(value, target)))); }
  assert.equal(contains(rendered, 'My name'), true);
});
