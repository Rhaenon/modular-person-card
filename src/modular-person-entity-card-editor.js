const HaPanelLovelace = customElements.get("ha-panel-lovelace");
const HuiMasonryView = customElements.get("hui-masonry-view");
const LitElement =
  window.LitElement ||
  (HaPanelLovelace ? Object.getPrototypeOf(HaPanelLovelace) : undefined) ||
  (HuiMasonryView ? Object.getPrototypeOf(HuiMasonryView) : undefined);

if (!LitElement) {
  throw new Error("Modular Person Card editor could not find LitElement in Home Assistant.");
}

const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class ModularPersonEntityCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
    };
  }

  static get styles() {
    return css`
      .section {
        margin-top: 20px;
      }

      .section-title {
        font-weight: 600;
        margin-bottom: 8px;
      }

      .rule-row {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
      }

      .rule-grid {
        display: grid;
        gap: 12px;
      }

      .toggle-row {
        display: flex;
        align-items: center;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 8px;
      }

      mwc-button {
        margin-right: 8px;
      }

      .add-custom-button {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-top: 8px;
        padding: 0;
        border: none;
        background: none;
        color: var(--primary-text-color);
        cursor: pointer;
        font: inherit;
      }

      .add-custom-button:hover .add-custom-icon,
      .add-custom-button:focus-visible .add-custom-icon {
        background: var(--primary-color);
      }

      .add-custom-button:focus-visible {
        outline: none;
      }

      .add-custom-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.12));
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-text-color);
        transition: background 0.2s ease;
      }

      .add-custom-label {
        color: var(--primary-text-color);
        font-weight: 500;
      }
    `;
  }

  constructor() {
    super();
    this._config = this._withDefaults({});
  }

  setConfig(config) {
    this._config = this._withDefaults(config);
  }

  _withDefaults(config) {
      const ringTrackerEnabled = Boolean(config.ring_tracker_enabled ?? config.ring_tracker_entity);
      const customLocationColors = Boolean(
        config.custom_location_colors ??
        config.home_icon_background_color ??
        config.away_icon_background_color ??
        config.zone_icon_background_color ??
        config.unknown_icon_background_color ??
        config.ring_active_color
      );
      return {
        entity: "",
        proximity_entity: "",
        findPhoneScriptId: "",
        show_history: true,
        history_hours: 24,
        ring_tracker_enabled: ringTrackerEnabled,
        ring_tracker_entity: "",
        ring_boolean_entity: "",
        ring_min: 0,
        ring_max: 100,
        custom_location_colors: customLocationColors,
        home_icon_background_color: "rgb(137,179,248,0.85)",
        away_icon_background_color: "rgb(244,67,54,0.75)",
        zone_icon_background_color: "rgb(76, 175, 80, 0.75)",
        unknown_icon_background_color: "rgb(160,160,160,0.75)",
        ring_active_color: "rgb(76, 175, 80, 0.75)",
        show_name: true,
        mirror_layout: false,
        custom_states: [],
        ...config,
      };
  }

  _computeLabel = (schema) => schema.label;

  render() {
    if (!this.hass) return html``;

    const schema = [
      {
        name: "entity",
        required: true,
        selector: {
          entity: {
            domain: ["person", "device_tracker"],
          },
        },
        label: "Entity",
      },
      {
        name: "show_name",
        type: "boolean",
        label: "Show Name",
      },
    ];

    if (this._config.show_name !== false) {
      schema.push({
        name: "mirror_layout",
        type: "boolean",
        label: "Mirror Layout",
      });
    }

    schema.push(
      {
        name: "proximity_entity",
        selector: {
          entity: {},
        },
        label: "Proximity",
      },
      {
        name: "findPhoneScriptId",
        selector: {
          entity: {
            domain: ["script", "button", "input_button"],
          },
        },
        label: "Find Phone Script",
      },
      {
        label: "Ring Tracker",
        name: "ring_tracker_enabled",
        type: "boolean",
      }
    );

    if (this._config.ring_tracker_enabled === true) {
      schema.push(
        {
          name: "ring_tracker_entity",
          selector: {
            entity: {},
          },
          label: "Ring Tracker Entity",
        },
        {
          name: "ring_boolean_entity",
          selector: {
            entity: {},
          },
          label: "Ring Boolean Sensor",
        },
        {
          name: "ring_min",
          selector: {
            number: {
              mode: "box",
            },
          },
          label: "Ring Minimum",
        },
        {
          name: "ring_max",
          selector: {
            number: {
              mode: "box",
            },
          },
          label: "Ring Maximum",
        }
      );
    }

    schema.push({
      name: "show_history",
      type: "boolean",
      label: "Show history?",
    });

    if (this._config.show_history !== false) {
      schema.push({
        name: "history_hours",
        selector: {
          number: {
            mode: "box",
            min: 1,
            step: 1,
          },
        },
        label: "History hours",
      });
    }

    schema.push({
      name: "custom_location_colors",
      type: "boolean",
      label: "Custom Colors",
    });

    if (this._config.custom_location_colors === true) {
      schema.push(
        {
          name: "home_icon_background_color",
          selector: {
            text: {},
          },
          label: "Home Color",
        },
        {
          name: "away_icon_background_color",
          selector: {
            text: {},
          },
          label: "Away Color",
        },
        {
          name: "zone_icon_background_color",
          selector: {
            text: {},
          },
          label: "Zone Color",
        },
        {
          name: "unknown_icon_background_color",
          selector: {
            text: {},
          },
          label: "Unknown Color",
        },
        {
          name: "ring_active_color",
          selector: {
            text: {},
          },
          label: "Ring Active Color",
        }
      );
    }

    const customStates = Array.isArray(this._config.custom_states) ? this._config.custom_states : [];

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>

      <div class="section">
        <div class="section-title">Custom Entities</div>
        ${customStates.map((rule, index) => html`
          <div class="rule-row">
            <div class="rule-grid">
              <ha-entity-picker
                .hass=${this.hass}
                .value=${rule.entity || ""}
                .label=${"Entity"}
                allow-custom-entity
                @value-changed=${(ev) => this._updateCustomState(index, "entity", ev.detail.value)}
              ></ha-entity-picker>

              <div class="toggle-row">
                <ha-formfield .label=${"Interactive Icon?"}>
                  <ha-switch
                    .checked=${rule.interactive_icon !== false}
                    @change=${(ev) => this._updateInteractiveIcon(index, ev.target.checked)}
                  ></ha-switch>
                </ha-formfield>
              </div>

              ${rule.interactive_icon !== false ? html`
                <ha-textfield
                  .value=${rule.state || ""}
                  .label=${"State / Rule"}
                  .placeholder=${"on, >100, 10...50, >=10 && <50, <10 || >50"}
                  @input=${(ev) => this._updateCustomState(index, "state", ev.target.value)}
                ></ha-textfield>

                <ha-icon-picker
                  .hass=${this.hass}
                  .value=${rule.icon || ""}
                  .label=${"Icon"}
                  @value-changed=${(ev) => this._updateCustomState(index, "icon", ev.detail.value)}
                ></ha-icon-picker>

                <ha-textfield
                  .value=${rule.color || ""}
                  .label=${"Color"}
                  .placeholder=${"Color description or hex value"}
                  @input=${(ev) => this._updateCustomState(index, "color", ev.target.value)}
                ></ha-textfield>
              ` : ""}
            </div>

            <div class="actions">
              <mwc-button @click=${() => this._removeCustomState(index)}>Remove</mwc-button>
            </div>
          </div>
        `)}

        <button class="add-custom-button" @click=${this._addCustomState} type="button">
          <span class="add-custom-icon">
            <ha-icon icon="mdi:plus"></ha-icon>
          </span>
          <span class="add-custom-label">Add custom</span>
        </button>
      </div>
    `;
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;

    this._config = {
      ...this._config,
      ...ev.detail.value,
      custom_states: Array.isArray(this._config.custom_states) ? this._config.custom_states : [],
    };

    this._notifyConfigChanged();
  }

  _addCustomState = () => {
    const customStates = [...(this._config.custom_states || [])];
    customStates.push({
      entity: "",
      state: "on",
      icon: "",
      color: "",
      interactive_icon: true,
    });
    this._config = { ...this._config, custom_states: customStates };
    this._notifyConfigChanged();
  };

  _removeCustomState(index) {
    const customStates = [...(this._config.custom_states || [])];
    customStates.splice(index, 1);
    this._config = { ...this._config, custom_states: customStates };
    this._notifyConfigChanged();
  }

  _updateCustomState(index, field, value) {
    const customStates = [...(this._config.custom_states || [])];
    customStates[index] = {
      ...customStates[index],
      [field]: value,
    };
    this._config = { ...this._config, custom_states: customStates };
    this._notifyConfigChanged();
  }

  _updateInteractiveIcon(index, checked) {
    const customStates = [...(this._config.custom_states || [])];
    customStates[index] = {
      ...customStates[index],
      interactive_icon: checked,
    };
    this._config = { ...this._config, custom_states: customStates };
    this.requestUpdate();
    this._notifyConfigChanged();
  }

  _notifyConfigChanged() {
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
  description: "A modular person card with custom entities and an optional ring tracker.",
});
