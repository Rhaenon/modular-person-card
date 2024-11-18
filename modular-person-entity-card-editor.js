import { LitElement, html } from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

class ModularPersonEntityCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
    };
  }

  constructor() {
    super();
    // Initialize _config with default values
    this._config = {
      entity: '',
      proximity_entity: '',
      findPhoneScriptId: '',
      show_name: true,
    };
  }

  setConfig(config) {
    // Merge the provided config with default values
    this._config = {
      entity: '',
      proximity_entity: '',
      findPhoneScriptId: '',
      show_name: true,
      ...config,
    };
  }


  _computeLabel = (schema) => {
    return schema.label;
  };

  render() {
    if (!this.hass) return html``;

    // Ensure _config is defined and has all required properties
    if (!this._config) {
      this._config = {
        entity: '',
        proximity_entity: '',
        findPhoneScriptId: '',
        show_name: true,
      };
    }

    // Schema for ha-form
    const schema = [
      {
        name: "entity",
        required: true,
        selector: {
          entity: {
            domain: "person",
          },
        },
        label: "Person",
      },
      {
        name: "proximity_entity",
        selector: {
          entity: {
            domain: "sensor",
          },
        },
        label: "Proximity",
      },
      {
        name: "findPhoneScriptId",
        selector: {
          entity: {
            domain: "script",
          },
        },
        label: "Find Phone Script",
      },
      {
        name: "show_name",
        type: "boolean",
        label: "Show Name",
      },
    ];

    // Return the form
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }

    // The new configuration is in ev.detail.value
    const config = ev.detail.value;

    // Update the local config with defaults
    this._config = {
      entity: '',
      proximity_entity: '',
      findPhoneScriptId: '',
      show_name: true,
      ...config,
    };

    // Dispatch config-changed event to save the changes
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define(
  "modular-person-entity-card-editor",
  ModularPersonEntityCardEditor
);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "modular-person-entity-card",
  name: "Modular Person Card",
  preview: true,
  description: "A modular card to display states related to persons.",
});
