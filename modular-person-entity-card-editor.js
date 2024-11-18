import {
  LitElement,
  html,
} from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

class ModularPersonEntityCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
    };
  }

  constructor() {
    super();
    this._config = {};
  }

  setConfig(config) {
    this._config = config || {};
    this.requestUpdate();
  }

  render() {
    if (!this.hass) return html``;

    // Schema for ha-form
    const schema = [
      {
        name: "Person",
        property: "entity",
        selector: {
          entity: { domain: "person" }, // Shows only person entities
        },
      },
      {
        name: "Proximity",
        property: "proximity_entity",
        selector: {
          entity: { domain: "sensor" }, // Shows only sensor entities for proximity
        },
      },
      {
        name: "Find Phone Script",
        property: "findPhoneScriptId",
        selector: {
          entity: { domain: "script" }, // Shows only script entities for find phone
        },
      },
      {
        name: "Show Name",
        property: "show_name",
        selector: {
          boolean: {}, // Creates a toggle switch
        },
      },
    ];

    // Return the form
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }

    const _config = Object.assign({}, this._config, ev.detail.value);

    this._config = _config;

    // Dispatch config-changed event to save the changes
    const event = new CustomEvent("config-changed", {
      detail: { config: _config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

// Register the custom element
customElements.define('modular-person-entity-card-editor', ModularPersonEntityCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "modular-person-entity-card",
  name: "Modular Person Card",
  preview: true,
  description: "A modular card to display states related to persons.",
});