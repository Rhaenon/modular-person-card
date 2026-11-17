const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const registry = new Map();
class LitElement {}
LitElement.prototype.html = (strings, ...values) => ({ strings, values });
LitElement.prototype.css = (strings, ...values) => ({ strings, values });
vm.runInNewContext(fs.readFileSync('modular-person-entity-card.js', 'utf8'), {
  window: { LitElement }, customElements: { get: name => registry.get(name), define: (name, cls) => registry.set(name, cls) }, console, requestAnimationFrame() {},
});
const Card = registry.get('modular-person-entity-card');
const entity = (state, attributes = {}) => ({ state: String(state), attributes });
test('selected tracker attribute takes precedence and unavailable tracker hides ring', () => {
  const card = new Card(); card.config = { ring_tracker_attribute: 'battery_level' };
  assert.equal(card._getRingIndicator(entity(12, { battery_level: 80 }), null).valueText, '80');
  assert.equal(card._getRingIndicator(entity('unavailable', { battery_level: 80 }), null), null);
  assert.equal(card._getRingIndicator(entity('unknown', { battery_level: 80 }), null), null);
  assert.equal(card._getRingIndicator(entity(12), null), null);
  card.config = {}; assert.equal(card._getRingIndicator(entity(12, { battery_level: 80 }), null).valueText, '12');
});
test('thresholds use normalized values and custom colors only when enabled', () => {
  const card = new Card(); card.config = { ring_min: 20, ring_max: 120, ring_critical_threshold: 20, ring_low_threshold: 50, ring_critical_color: 'red', ring_low_color: 'orange', ring_normal_color: 'blue' };
  assert.equal(card._getRingIndicator(entity(40), null).color, '#ff9800');
  card.config.custom_location_colors = true;
  assert.equal(card._getRingIndicator(entity(40), null).color, 'red');
  assert.equal(card._getRingIndicator(entity(70), null).color, 'orange');
  assert.equal(card._getRingIndicator(entity(71), null).color, 'blue');
});
test('selected boolean attribute controls active signal', () => {
  const card = new Card(); card.config = { ring_boolean_attribute: 'plugged_in' };
  const tracker = entity(80, { charging: true });
  assert.equal(card._getRingIndicator(tracker, entity('off', { plugged_in: true })).isCharging, true);
  assert.equal(card._getRingIndicator(tracker, entity('on', { plugged_in: false })).isCharging, false);
  card.config = {}; assert.equal(card._getRingIndicator(tracker, null).isCharging, true);
});
