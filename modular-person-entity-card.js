import { LitElement, html, css } from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";
import './modular-person-popup.js';

class ModularPersonEntityCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
    };
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        height: 100%;
        flex-grow: 1;
      }
      ha-card {
        padding: 4% 4%;
        font-family: Arial, sans-serif;
        background-color: var(--card-background-color, #1e1e1e);
        color: var(--primary-text-color, white);
        display: flex;
        flex-direction: column;
        justify-content: var(--justify-content, center);
        align-items: center;
        min-height: 100px;
        box-sizing: border-box;
        overflow: hidden;
        position: relative;
        cursor: pointer;
        height: 100%;
        flex-grow: 1;
      }
      .card-content {
        display: flex;
        flex-direction: var(--flex-direction, row);
        flex-wrap: wrap;
        row-gap: 5px;
        column-gap: 25px;
        align-items: center;
        justify-content: center;
        text-align: var(--text-align, left);
        width: 100%;
        padding: var(--padding, 10px 5px 5px 10px);
      }
      .entity-picture-container {
        position: relative;
        display: inline-block;
        text-align: center;
      }
      .entity-picture {
        border-radius: 50%;
        width: 40px;
        height: 40px;
        border: solid 0.15em var(--icon-background-color);
        border-radius: 24px;
      }
      .state-icon {
        position: absolute;
        top: -8px;
        right: -12px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: var(--icon-background-color);
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .state-icon ha-icon {
        padding-right: 4px;
        padding-bottom: 4px;
        width: 20px;
        height: 20px;
        display: block;
      }
      .name-text {
        font-weight: bold;
        font-size: 1.06em;
        letter-spacing: 0.015em;
      }
      .state-text {
        font-size: 1em;
        color: gray;
        font-weight: bold;
        max-width: 100%;
        letter-spacing: 0.015em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .entity-text-container {
        display: flex;
        flex-direction: column;
        max-width: 100%;
      }
    `;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this.config = config;
  }

  getCardSize() {
    return 1;
  }

  getLayoutOptions() {
    return {
      grid_rows: 2,
      grid_columns: 2,
      grid_min_rows: 2,
    };
  }

  render() {
    if (!this.hass || !this.config) {
      return html``;
    }

    const entity = this.hass.states[this.config.entity];
    if (!entity) {
      return html`
        <style>
          ha-card {
            padding: 16px;
            font-family: Arial, sans-serif;
          }
        </style>
        <ha-card>Entity not available: ${this.config.entity}</ha-card>
      `;
    }

    const name = this.config.name || entity.attributes.friendly_name;
    const stateIcon = this._getStateIcon(entity);
    const iconBackgroundColor = this._getStateIconBackgroundColor(entity.state);
    const entityPicture =
      entity.attributes.entity_picture || "https://via.placeholder.com/40"; // Fallback image

    // Get state description with distance if applicable
    const stateText = this._getStateDescription(entity.state);

    const showName = this.config.show_name !== false; // Default to true if not explicitly set to false

    // Set styles based on whether the name is shown
    const layoutClass = showName ? "horizontal" : "vertical";
    const alignmentClass = showName ? "align-left" : "align-center";

    return html`
      <ha-card
        @click="${this._showPopup}"
        style="
          --icon-background-color: ${iconBackgroundColor};
          --flex-direction: ${showName ? "row" : "column"};
          --justify-content: ${showName ? "center" : "flex-start"};
          --column-gap: ${showName ? "25px" : "5px"};
          --row-gap: ${showName ? "5px" : "0"};
          --text-align: ${showName ? "left" : "center"};
          --padding: ${showName
            ? "10px 5px 5px 10px"
            : "10px 5px 5px 5px"};
        "
      >
        <div class="card-content ${layoutClass} ${alignmentClass}">
          <div class="entity-picture-container">
            <img src="${entityPicture}" class="entity-picture" />
            <div class="state-icon">
              <ha-icon icon="${stateIcon}"></ha-icon>
            </div>
          </div>
          <div class="entity-text-container">
            ${showName ? html`<div class="name-text">${name}</div>` : ""}
            <div class="state-text">${stateText}</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _getStateDescription(state) {
    if (state === "home") {
      return "Home";
    } else if (state === "not_home") {
      // Handle distance display using proximity entity
      if (
        this.config.proximity_entity &&
        this.hass.states[this.config.proximity_entity]
      ) {
        const proximityState =
          this.hass.states[this.config.proximity_entity].state;
        const distance = parseFloat(proximityState);

        if (!isNaN(distance)) {
          if (distance < 1000) {
            return html`Away <br />(${distance}m)`;
          } else if (distance / 1000 < 1000) {
            return html`Away <br />(${(distance / 1000).toFixed(1)}km)`;
          } else if (distance / 1000 > 999) {
            return html`Away <br />(${(distance / 1000).toFixed(0)}km)`;
          }
        }
      }
      return "Away";
    } else if (state === "unknown" || state === "unavailable") {
      return "Unknown";
    }
    return state.charAt(0).toUpperCase() + state.slice(1); // Capitalizes any other states
  }

  _getStateIcon(entity) {
    if (this.config.custom_states) {
      const customState = this.config.custom_states.find(
        (cs) =>
          cs.entity === entity.entity_id && cs.state === entity.state
      );
      if (customState) {
        return customState.icon;
      }
    }

    // Check if the state is a zone and use its icon if available
    if (
      entity.state &&
      this.hass.states[`zone.${entity.state.toLowerCase()}`]
    ) {
      const zone =
        this.hass.states[`zone.${entity.state.toLowerCase()}`];
      return zone.attributes.icon || "mdi:map-marker";
    }

    if (entity.state === "home") return "mdi:home";
    if (entity.state === "not_home") return "mdi:home-export-outline";
    if (entity.state === "unknown" || entity.state === "unavailable")
      return "mdi:map-marker-question";
    return this.config.icon || "mdi:account";
  }

  _getStateIconBackgroundColor(state) {
    switch (state) {
      case "home":
        return "var(--home-icon-background-color, #478cff)"; // Use theme variable or fallback to blue
      case "not_home":
        return "var(--away-icon-background-color, #ff4d4d)"; // Use theme variable or fallback to red
      case "unknown":
      case "unavailable":
        return "var(--unknown-icon-background-color, #a0a0a0)"; // Use theme variable or fallback to grey
      default:
        return "var(--zone-icon-background-color, #32a852)"; // Use theme variable or fallback to green
    }
  }

_showPopup() {
    const popup = document.createElement('modular-person-popup');
    popup.hass = this.hass;
    popup.config = this.config;
    popup.entityId = this.config.entity;
    document.body.appendChild(popup);
  }

  // Adding support for the UI editor
  static getConfigElement() {
    return document.createElement("modular-person-entity-card-editor");
  }

  static getStubConfig(hass) {
    const personEntities = Object.keys(hass.states).filter((entityId) =>
      entityId.startsWith("person.")
    );

    const randomPerson =
      personEntities.length > 0
        ? personEntities[
            Math.floor(Math.random() * personEntities.length)
          ]
        : "person.fallback";

    // Extract the name from randomPerson (e.g., person.john -> john)
    const personName = randomPerson.split(".")[1];

    return {
      entity: randomPerson,
      proximity_entity: `sensor.home_${personName}_distance`, // Use dynamic proximity sensor based on the person name
      show_name: true,
    };
  }
}

customElements.define(
  "modular-person-entity-card",
  ModularPersonEntityCard
);
